package service

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type CommissionService struct {
	db *gorm.DB
}

func NewCommissionService(db *gorm.DB) *CommissionService {
	return &CommissionService{db: db}
}

func (s *CommissionService) CreateCommission(userID uint64, req dto.CommissionCreateRequest) (*model.Commission, error) {
	commissionNumber, err := s.generateCommissionNumber()
	if err != nil {
		return nil, err
	}

	features, err := json.Marshal(req.Features)
	if err != nil {
		return nil, err
	}
	if req.ReferenceFiles == "" {
		req.ReferenceFiles = "[]"
	}
	if !json.Valid([]byte(req.ReferenceFiles)) {
		return nil, fmt.Errorf("invalid reference files")
	}
	commission := model.Commission{
		CommissionNumber:     commissionNumber,
		UserID:               userID,
		Status:               "draft",
		CharacterName:        req.CharacterName,
		CharacterSpecies:     req.CharacterSpecies,
		Style:                req.Style,
		Size:                 req.Size,
		Features:             string(features),
		BudgetMinCents:       req.BudgetMinCents,
		BudgetMaxCents:       req.BudgetMaxCents,
		Description:          req.Description,
		ReferenceFiles:       req.ReferenceFiles,
		CopyrightDeclaration: req.CopyrightDeclaration,
	}

	if req.DeadlineDate != "" {
		commission.DeadlineDate = &req.DeadlineDate
	}

	if err := s.db.Create(&commission).Error; err != nil {
		return nil, err
	}

	return &commission, nil
}

func (s *CommissionService) GetCommission(userID uint64, commissionID uint64) (*model.Commission, error) {
	var commission model.Commission
	if err := s.db.Preload("User").Preload("Maker").
		First(&commission, commissionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("commission not found")
		}
		return nil, err
	}

	if commission.UserID != userID {
		return nil, fmt.Errorf("commission not found")
	}
	commission.InternalNotes = ""
	commission.User = nil
	commission.Maker = nil

	return &commission, nil
}

func (s *CommissionService) ListCommissions(page, pageSize int, status string, userID, makerID *uint64) (*dto.PaginatedResponse, error) {
	var commissions []model.Commission
	var total int64

	query := s.db.Model(&model.Commission{})

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	if makerID != nil {
		query = query.Where("maker_id = ?", *makerID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("User").Preload("Maker").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&commissions).Error; err != nil {
		return nil, err
	}

	if userID != nil {
		for i := range commissions {
			commissions[i].InternalNotes = ""
			commissions[i].User = nil
			commissions[i].Maker = nil
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       commissions,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *CommissionService) SubmitCommission(userID, id uint64) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", id, userID).First(&commission).Error; err != nil {
			return fmt.Errorf("commission not found")
		}
		if commission.Status == "submitted" {
			return nil
		}
		if commission.CharacterName == "" || commission.CharacterSpecies == "" || commission.Style == "" || commission.Size == "" || commission.CopyrightDeclaration == "" {
			return fmt.Errorf("character, species, style, size and rights declaration are required")
		}
		text := strings.ToLower(commission.Description + " " + commission.CharacterName + " " + commission.Features)
		for _, keyword := range []string{"māori", "maori", "tā moko", "ta moko", "whakairo", "mātauranga", "iwi", "hapū"} {
			if strings.Contains(text, keyword) {
				commission.CulturalFlag = true
			}
		}
		if err := tx.Model(&commission).Update("cultural_flag", commission.CulturalFlag).Error; err != nil {
			return err
		}
		return NewCommissionFSM(tx).Transition(&commission, "submitted", userID, "Application submitted")
	})
	return &commission, err
}

func (s *CommissionService) UpdateCommission(commissionID uint64, req dto.CommissionUpdateRequest, actorID uint64) (*model.Commission, error) {
	var commission model.Commission
	if err := s.db.First(&commission, commissionID).Error; err != nil {
		return nil, fmt.Errorf("commission not found")
	}

	fromStatus := commission.Status

	updates := map[string]interface{}{}
	if req.CharacterName != "" {
		updates["character_name"] = req.CharacterName
	}
	if req.CharacterSpecies != "" {
		updates["character_species"] = req.CharacterSpecies
	}
	if req.Style != "" {
		updates["style"] = req.Style
	}
	if req.Size != "" {
		updates["size"] = req.Size
	}
	if req.Features != "" {
		updates["features"] = req.Features
	}
	if req.InternalNotes != "" {
		updates["internal_notes"] = req.InternalNotes
	}
	if req.MakerID != nil {
		return nil, fmt.Errorf("use maker assignment workflow")
	}
	if req.EstimatedStart != "" {
		updates["estimated_start"] = req.EstimatedStart
	}
	if req.EstimatedEnd != "" {
		updates["estimated_end"] = req.EstimatedEnd
	}

	if err := s.db.Model(&commission).Updates(updates).Error; err != nil {
		return nil, err
	}

	if fromStatus != commission.Status {
		history := model.CommissionStatusHistory{
			CommissionID: commissionID,
			FromStatus:   fromStatus,
			ToStatus:     commission.Status,
			ActorID:      &actorID,
		}
		s.db.Create(&history)
	}

	s.db.Preload("User").Preload("Maker").First(&commission, commissionID)
	return &commission, nil
}

func (s *CommissionService) AssignMaker(id, makerID, actorID uint64) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, id).Error; err != nil {
			return err
		}
		if commission.Status != "scheduled" || commission.DepositReceivedCents == 0 {
			return fmt.Errorf("deposit must be confirmed before assignment")
		}
		var maker model.User
		if err := tx.Preload("Roles.Permissions").First(&maker, makerID).Error; err != nil {
			return fmt.Errorf("maker not found")
		}
		allowed := false
		for _, r := range maker.Roles {
			for _, p := range r.Permissions {
				if p.Code == "milestones.update_assigned" {
					allowed = true
				}
			}
		}
		if !allowed || maker.Status != "active" {
			return fmt.Errorf("active maker required")
		}
		before := commission.MakerID
		commission.MakerID = &makerID
		if err := tx.Model(&commission).Update("maker_id", makerID).Error; err != nil {
			return err
		}
		return NewAuditService(tx).LogWithTx(tx, &actorID, "commissions.assign", "commissions", &id, before, makerID, "", "", "")
	})
	return &commission, err
}
func (s *CommissionService) generateCommissionNumber() (string, error) {
	return "CM-" + time.Now().UTC().Format("20060102") + "-" + uuid.NewString()[:12], nil
}
