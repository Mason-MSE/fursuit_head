package service

import (
	"encoding/json"
	"math"
	"strconv"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type AuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

func (s *AuditService) Log(actorID *uint64, action, resourceType string, resourceID *uint64, before, after interface{}, requestID, ip, userAgent string) error {
	return s.LogWithTx(s.db, actorID, action, resourceType, resourceID, before, after, requestID, ip, userAgent)
}

func (s *AuditService) LogWithTx(tx *gorm.DB, actorID *uint64, action, resourceType string, resourceID *uint64, before, after interface{}, requestID, ip, userAgent string) error {
	beforeJSON, afterJSON := "null", "null"

	if before != nil {
		b, err := json.Marshal(before)
		if err != nil {
			return err
		}
		beforeJSON = string(b)
	}

	if after != nil {
		a, err := json.Marshal(after)
		if err != nil {
			return err
		}
		afterJSON = string(a)
	}

	log := model.AuditLog{
		ActorID:      actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		BeforeState:  beforeJSON,
		AfterState:   afterJSON,
		RequestID:    requestID,
		IPAddress:    ip,
		UserAgent:    userAgent,
	}

	return tx.Create(&log).Error
}

func (s *AuditService) ListAuditLogs(page, pageSize int, req dto.AuditLogListRequest) (*dto.PaginatedResponse, error) {
	var logs []model.AuditLog
	var total int64

	query := s.db.Model(&model.AuditLog{})

	if req.ActorID != "" {
		if actorID, err := strconv.ParseUint(req.ActorID, 10, 64); err == nil {
			query = query.Where("actor_id = ?", actorID)
		}
	}
	if req.ResourceType != "" {
		query = query.Where("resource_type = ?", req.ResourceType)
	}
	if req.ResourceID != "" {
		if resourceID, err := strconv.ParseUint(req.ResourceID, 10, 64); err == nil {
			query = query.Where("resource_id = ?", resourceID)
		}
	}
	if req.Action != "" {
		query = query.Where("action = ?", req.Action)
	}
	if req.DateFrom != "" {
		query = query.Where("created_at >= ?", req.DateFrom)
	}
	if req.DateTo != "" {
		query = query.Where("created_at <= ?", req.DateTo+" 23:59:59")
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
