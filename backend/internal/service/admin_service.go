package service

import (
	"fmt"
	"math"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type AdminService struct {
	db *gorm.DB
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

func (s *AdminService) ListUsers(page, pageSize int, status, search string) (*dto.PaginatedResponse, error) {
	var users []model.User
	var total int64

	query := s.db.Model(&model.User{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("(email LIKE ? OR full_name LIKE ?)", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Roles").Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       users,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *AdminService) GetUser(userID uint64) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles").First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *AdminService) UpdateUser(userID uint64, req dto.UserUpdateAdminRequest, actorID uint64) (*model.User, error) {
	var result model.User
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Serialize changes to privileged users so two demotions cannot remove the final administrator.
		var super model.Role
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code = ?", "super_admin").First(&super).Error; err != nil {
			return err
		}
		var actor, user model.User
		if err := tx.Preload("Roles.Permissions").First(&actor, actorID).Error; err != nil {
			return err
		}
		if err := tx.Preload("Roles").First(&user, userID).Error; err != nil {
			return fmt.Errorf("user not found")
		}
		actorSuper, targetSuper, canAssign := false, false, false
		for _, r := range actor.Roles {
			if r.Code == "super_admin" {
				actorSuper = true
			}
			for _, p := range r.Permissions {
				if p.Code == "roles.assign" {
					canAssign = true
				}
			}
		}
		for _, r := range user.Roles {
			if r.Code == "super_admin" {
				targetSuper = true
			}
		}
		if targetSuper && !actorSuper {
			return fmt.Errorf("cannot modify a Super Admin")
		}
		before := map[string]interface{}{"status": user.Status, "roles": user.Roles, "full_name": user.FullName}
		removingSuper := req.Status != "" && req.Status != "active" && targetSuper
		if req.RoleCodes != nil {
			if !canAssign {
				return fmt.Errorf("roles.assign permission required")
			}
			seen := map[string]bool{}
			for _, code := range req.RoleCodes {
				seen[code] = true
			}
			if seen["super_admin"] && !actorSuper {
				return fmt.Errorf("cannot assign Super Admin")
			}
			removingSuper = removingSuper || (targetSuper && !seen["super_admin"])
			var roles []model.Role
			if len(req.RoleCodes) > 0 {
				if err := tx.Where("code IN ?", req.RoleCodes).Find(&roles).Error; err != nil {
					return err
				}
			}
			if len(roles) != len(seen) {
				return fmt.Errorf("unknown role")
			}
			if err := tx.Model(&user).Association("Roles").Replace(roles); err != nil {
				return err
			}
		}
		if removingSuper {
			var count int64
			if err := tx.Table("user_roles").Joins("JOIN users ON users.id=user_roles.user_id").Where("role_id = ? AND users.status = ? AND users.id <> ?", super.ID, "active", userID).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				return fmt.Errorf("cannot remove the last active Super Admin")
			}
		}
		if req.Status != "" {
			switch req.Status {
			case "active", "suspended", "locked", "deleted", "pending_email":
			default:
				return fmt.Errorf("invalid user status")
			}
			if req.Status == "active" && user.EmailVerifiedAt == nil {
				return fmt.Errorf("email verification required")
			}
			user.Status = req.Status
		}
		if req.FullName != "" {
			user.FullName = req.FullName
		}
		if req.Phone != "" {
			user.Phone.String = req.Phone
			user.Phone.Valid = true
		}
		if err := tx.Omit("Roles").Save(&user).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", userID).Update("revoked_at", time.Now().UTC()).Error; err != nil {
			return err
		}
		if err := tx.Preload("Roles").First(&result, userID).Error; err != nil {
			return err
		}
		return NewAuditService(tx).LogWithTx(tx, &actorID, "users.update", "users", &userID, before, map[string]interface{}{"status": result.Status, "roles": result.Roles, "full_name": result.FullName}, "", "", "")
	})
	return &result, err
}

func (s *AdminService) ListRoles() ([]model.Role, error) {
	var roles []model.Role
	if err := s.db.Preload("Permissions").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (s *AdminService) CreateRole(req dto.RoleCreateRequest) (*model.Role, error) {
	var existing model.Role
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("role code already exists")
	}

	role := model.Role{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := s.db.Create(&role).Error; err != nil {
		return nil, err
	}

	if len(req.PermissionIDs) > 0 {
		var permissions []model.Permission
		if err := s.db.Where("id IN ?", req.PermissionIDs).Find(&permissions).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&role).Association("Permissions").Replace(permissions); err != nil {
			return nil, err
		}
		if err := s.revokeRoleSessions(role.ID); err != nil {
			return nil, err
		}
	}

	s.db.Preload("Permissions").First(&role, role.ID)
	return &role, nil
}

func (s *AdminService) UpdateRole(roleID uint64, req dto.RoleUpdateRequest) (*model.Role, error) {
	var role model.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		return nil, fmt.Errorf("role not found")
	}

	if role.IsSystem {
		return nil, fmt.Errorf("cannot modify system role")
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = req.Description
	}

	if err := s.db.Save(&role).Error; err != nil {
		return nil, err
	}

	if req.PermissionIDs != nil {
		var permissions []model.Permission
		if err := s.db.Where("id IN ?", req.PermissionIDs).Find(&permissions).Error; err != nil {
			return nil, err
		}
		if err := s.db.Model(&role).Association("Permissions").Replace(permissions); err != nil {
			return nil, err
		}
		if err := s.revokeRoleSessions(role.ID); err != nil {
			return nil, err
		}
	}

	s.db.Preload("Permissions").First(&role, role.ID)
	return &role, nil
}

func (s *AdminService) GetDashboardStats() (map[string]interface{}, error) {
	stats := map[string]interface{}{}

	var totalOrders int64
	s.db.Model(&model.Order{}).Count(&totalOrders)
	stats["total_orders"] = totalOrders

	var totalRevenue int64
	s.db.Model(&model.Payment{}).Where("status = ?", "completed").Select("COALESCE(SUM(amount_cents), 0)").Scan(&totalRevenue)
	stats["revenue"] = totalRevenue / 100

	var activeCommissions int64
	s.db.Model(&model.Commission{}).Where("status NOT IN ?", []string{"completed", "cancelled", "disputed"}).Count(&activeCommissions)
	stats["active_commissions"] = activeCommissions

	var pendingTickets int64
	s.db.Model(&model.SupportTicket{}).Where("status IN ?", []string{"open", "in_progress"}).Count(&pendingTickets)
	stats["pending_tickets"] = pendingTickets

	var totalUsers int64
	s.db.Model(&model.User{}).Where("status = ?", "active").Count(&totalUsers)
	stats["total_users"] = totalUsers

	var pendingPayments int64
	s.db.Model(&model.Payment{}).Where("status = ?", "pending").Count(&pendingPayments)
	stats["pending_payments"] = pendingPayments

	return stats, nil
}

func (s *AdminService) GetRecentActivity(limit int) ([]map[string]interface{}, error) {
	var logs []model.AuditLog
	if err := s.db.Order("created_at DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}

	var activities []map[string]interface{}
	for _, log := range logs {
		actorName := "System"
		if log.ActorID != nil {
			var user model.User
			if err := s.db.First(&user, *log.ActorID).Error; err == nil {
				actorName = user.FullName
			}
		}
		activities = append(activities, map[string]interface{}{
			"id":          log.ID,
			"actor":       actorName,
			"action":      log.Action,
			"resource":    log.ResourceType,
			"resource_id": log.ResourceID,
			"created_at":  log.CreatedAt.Format(time.RFC3339),
		})
	}

	if activities == nil {
		activities = []map[string]interface{}{}
	}

	return activities, nil
}

func (s *AdminService) GetOrder(orderID uint64) (*model.Order, error) {
	var order model.Order
	if err := s.db.Preload("Items").Preload("History").Preload("Payments").Preload("User").Preload("ShippingAddress").
		First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}
	return &order, nil
}

func (s *AdminService) GetCommission(commissionID uint64) (*model.Commission, error) {
	var commission model.Commission
	if err := s.db.Preload("User").Preload("Maker").
		First(&commission, commissionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("commission not found")
		}
		return nil, err
	}
	return &commission, nil
}

func (s *AdminService) GetUserOrders(userID uint64, page, pageSize int) (*dto.PaginatedResponse, error) {
	var orders []model.Order
	var total int64

	query := s.db.Model(&model.Order{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Items").Offset(offset).Limit(pageSize).
		Order("created_at DESC").Find(&orders).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	return &dto.PaginatedResponse{
		Data: orders, Total: total, Page: page, PageSize: pageSize, TotalPages: totalPages,
	}, nil
}

func (s *AdminService) GetUserAuditTrail(userID uint64, page, pageSize int) (*dto.PaginatedResponse, error) {
	var logs []model.AuditLog
	var total int64

	query := s.db.Model(&model.AuditLog{}).Where("actor_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).
		Order("created_at DESC").Find(&logs).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	return &dto.PaginatedResponse{
		Data: logs, Total: total, Page: page, PageSize: pageSize, TotalPages: totalPages,
	}, nil
}

func (s *AdminService) GetPermissions() ([]model.Permission, error) {
	var permissions []model.Permission
	if err := s.db.Order("module ASC, code ASC").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

func (s *AdminService) GetRole(roleID uint64) (*model.Role, error) {
	var role model.Role
	if err := s.db.Preload("Permissions").First(&role, roleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, err
	}
	return &role, nil
}

func (s *AdminService) DeleteRole(roleID uint64) error {
	var role model.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		return fmt.Errorf("role not found")
	}
	if role.IsSystem {
		return fmt.Errorf("cannot delete system role")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := (&AdminService{db: tx}).revokeRoleSessions(role.ID); err != nil {
			return err
		}
		return tx.Delete(&role).Error
	})
}

func (s *AdminService) GetTicket(ticketID uint64) (*model.SupportTicket, error) {
	var ticket model.SupportTicket
	if err := s.db.Preload("Messages.Sender").Preload("User").
		First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("ticket not found")
		}
		return nil, err
	}
	return &ticket, nil
}

func (s *AdminService) AddTicketMessage(ticketID uint64, senderID uint64, message string, isInternal bool) (*model.TicketMessage, error) {
	var ticket model.SupportTicket
	if err := s.db.First(&ticket, ticketID).Error; err != nil {
		return nil, fmt.Errorf("ticket not found")
	}

	if ticket.Status == "closed" {
		return nil, fmt.Errorf("cannot add message to a closed ticket")
	}

	if ticket.Status == "open" {
		ticket.Status = "in_progress"
		s.db.Save(&ticket)
	}

	msg := model.TicketMessage{
		TicketID:   ticketID,
		SenderID:   senderID,
		Message:    message,
		IsInternal: isInternal,
	}

	if err := s.db.Create(&msg).Error; err != nil {
		return nil, err
	}

	return &msg, nil
}

func (s *AdminService) ListAuditLogs(page, pageSize int, actorID, resourceType string) (*dto.PaginatedResponse, error) {
	var logs []model.AuditLog
	var total int64

	query := s.db.Model(&model.AuditLog{})

	if actorID != "" {
		query = query.Where("actor_id = ?", actorID)
	}
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       logs,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *AdminService) revokeRoleSessions(roleID uint64) error {
	return s.db.Model(&model.RefreshToken{}).Where("user_id IN (?) AND revoked_at IS NULL", s.db.Table("user_roles").Select("user_id").Where("role_id = ?", roleID)).Update("revoked_at", time.Now().UTC()).Error
}
