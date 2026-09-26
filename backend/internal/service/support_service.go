package service

import (
	"fmt"
	"math"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type SupportService struct {
	db *gorm.DB
}

func NewSupportService(db *gorm.DB) *SupportService {
	return &SupportService{db: db}
}

func (s *SupportService) CreateTicket(userID uint64, req dto.TicketCreateRequest) (*model.SupportTicket, error) {
	if req.OrderID != nil {
		var order model.Order
		if err := s.db.Where("id = ? AND user_id = ?", *req.OrderID, userID).First(&order).Error; err != nil {
			return nil, fmt.Errorf("order not found")
		}
	}
	if req.CommissionID != nil {
		var commission model.Commission
		if err := s.db.Where("id = ? AND user_id = ?", *req.CommissionID, userID).First(&commission).Error; err != nil {
			return nil, fmt.Errorf("commission not found")
		}
	}
	ticketNumber, err := s.generateTicketNumber()
	if err != nil {
		return nil, err
	}

	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	ticket := model.SupportTicket{
		TicketNumber: ticketNumber,
		UserID:       userID,
		OrderID:      req.OrderID,
		CommissionID: req.CommissionID,
		Type:         req.Type,
		Status:       "open",
		Priority:     priority,
		Subject:      req.Subject,
	}

	if err := s.db.Create(&ticket).Error; err != nil {
		return nil, err
	}

	message := model.TicketMessage{
		TicketID: ticket.ID,
		SenderID: userID,
		Message:  req.Message,
	}
	if err := s.db.Create(&message).Error; err != nil {
		return nil, err
	}

	return &ticket, nil
}

func (s *SupportService) GetTicket(ticketID uint64) (*model.SupportTicket, error) {
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

func (s *SupportService) ListTickets(page, pageSize int, status, assignedTo string, ownerID ...uint64) (*dto.PaginatedResponse, error) {
	var tickets []model.SupportTicket
	var total int64

	query := s.db.Model(&model.SupportTicket{})
	if len(ownerID) > 0 {
		query = query.Where("user_id = ?", ownerID[0])
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if assignedTo != "" {
		if assignedTo == "unassigned" {
			query = query.Where("assigned_to IS NULL")
		} else {
			query = query.Where("assigned_to = ?", assignedTo)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("User").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&tickets).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       tickets,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *SupportService) AddMessage(ticketID uint64, senderID uint64, message string, isInternal bool) (*model.TicketMessage, error) {
	var ticket model.SupportTicket
	if err := s.db.First(&ticket, ticketID).Error; err != nil {
		return nil, fmt.Errorf("ticket not found")
	}

	if ticket.UserID != senderID {
		return nil, fmt.Errorf("ticket not found")
	}
	if isInternal {
		return nil, fmt.Errorf("internal messages are staff-only")
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

func (s *SupportService) UpdateTicketStatus(ticketID uint64, status string, actorID uint64) (*model.SupportTicket, error) {
	var ticket model.SupportTicket
	if err := s.db.First(&ticket, ticketID).Error; err != nil {
		return nil, fmt.Errorf("ticket not found")
	}

	validStatuses := map[string]bool{
		"open": true, "in_progress": true, "waiting_customer": true,
		"resolved": true, "closed": true,
	}
	if !validStatuses[status] {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	ticket.Status = status
	now := time.Now()

	if status == "resolved" {
		ticket.ResolvedAt = &now
	}
	if status == "closed" {
		ticket.ClosedAt = &now
	}

	if err := s.db.Save(&ticket).Error; err != nil {
		return nil, err
	}

	return &ticket, nil
}

func (s *SupportService) generateTicketNumber() (string, error) {
	dateStr := time.Now().Format("20060102")
	prefix := "TKT-" + dateStr + "-"

	var count int64
	today := time.Now().Format("2006-01-02")
	s.db.Model(&model.SupportTicket{}).
		Where("ticket_number LIKE ?", prefix+"%").
		Where("DATE(created_at) = ?", today).
		Count(&count)

	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}
