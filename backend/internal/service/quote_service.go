package service

import (
	"encoding/json"
	"fmt"
	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

type QuoteService struct{ db *gorm.DB }

func NewQuoteService(db *gorm.DB) *QuoteService { return &QuoteService{db: db} }
func (s *QuoteService) CreateQuote(req dto.QuoteCreateRequest, actor uint64) (*model.Quote, error) {
	if req.DepositPercent == 0 {
		req.DepositPercent = 30
	}
	if req.DepositPercent < 1 || req.DepositPercent > 99 {
		return nil, fmt.Errorf("deposit percentage must be between 1 and 99")
	}
	if !json.Valid([]byte(req.Items)) || req.SubtotalCents == 0 || req.Terms == "" {
		return nil, fmt.Errorf("items, positive price and terms required")
	}
	total := req.SubtotalCents + req.TaxCents
	if total < req.SubtotalCents {
		return nil, fmt.Errorf("amount overflow")
	}
	var quote model.Quote
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var commission model.Commission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, req.CommissionID).Error; err != nil {
			return err
		}
		if commission.Status != "approved_for_quote" && commission.Status != "quoted" {
			return fmt.Errorf("application must be approved for quote")
		}
		if commission.CulturalFlag && commission.CulturalDecision != "approved" && commission.CulturalDecision != "conditional" {
			return fmt.Errorf("cultural approval required")
		}
		var latest int
		if err := tx.Model(&model.Quote{}).Where("commission_id = ?", commission.ID).Select("COALESCE(MAX(version),0)").Scan(&latest).Error; err != nil {
			return err
		}
		quote = model.Quote{QuoteNumber: "QT-" + uuid.NewString(), CommissionID: commission.ID, Version: latest + 1, Status: "draft", Items: req.Items, SubtotalCents: req.SubtotalCents, TaxCents: req.TaxCents, TotalCents: total, DepositPercent: req.DepositPercent, DepositAmountCents: total/100*uint64(req.DepositPercent) + (total%100*uint64(req.DepositPercent)+50)/100, EstimatedDays: req.EstimatedDays, Terms: req.Terms, CreatedBy: &actor}
		return tx.Create(&quote).Error
	})
	return &quote, err
}
func (s *QuoteService) SendQuote(id uint64) (*model.Quote, error) {
	var quote model.Quote
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&quote, id).Error; err != nil {
			return err
		}
		if quote.Status == "sent" {
			return nil
		}
		if quote.Status != "draft" {
			return fmt.Errorf("only draft quotes can be sent")
		}
		var commission model.Commission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, quote.CommissionID).Error; err != nil {
			return err
		}
		if commission.Status != "approved_for_quote" && commission.Status != "quoted" {
			return fmt.Errorf("commission is not ready for a quote")
		}
		if commission.CulturalFlag && commission.CulturalDecision != "approved" && commission.CulturalDecision != "conditional" {
			return fmt.Errorf("cultural approval required")
		}
		if err := tx.Model(&model.Quote{}).Where("commission_id = ? AND id <> ? AND status IN ?", commission.ID, id, []string{"sent", "draft"}).Updates(map[string]interface{}{"status": "superseded", "superseded_by": id}).Error; err != nil {
			return err
		}
		expires := time.Now().Add(14 * 24 * time.Hour)
		quote.Status = "sent"
		quote.ExpiresAt = &expires
		if err := tx.Save(&quote).Error; err != nil {
			return err
		}
		if commission.Status != "quoted" {
			actor := uint64(0)
			if quote.CreatedBy != nil {
				actor = *quote.CreatedBy
			}
			return NewCommissionFSM(tx).Transition(&commission, "quoted", actor, "Quote sent")
		}
		return nil
	})
	return &quote, err
}
func (s *QuoteService) AcceptQuote(commissionID, quoteID, userID uint64, accept bool) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", commissionID, userID).First(&commission).Error; err != nil {
			return fmt.Errorf("commission not found")
		}
		var quote model.Quote
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND commission_id = ?", quoteID, commissionID).First(&quote).Error; err != nil {
			return fmt.Errorf("quote not found")
		}
		if accept && quote.Status == "accepted" {
			return nil
		}
		if !accept && quote.Status == "rejected" {
			return nil
		}
		if quote.Status != "sent" || quote.ExpiresAt == nil || time.Now().After(*quote.ExpiresAt) {
			return fmt.Errorf("quote is not valid for acceptance")
		}
		now := time.Now().UTC()
		to := "deposit_pending"
		quote.Status = "accepted"
		quote.AcceptedAt = &now
		if !accept {
			quote.Status = "rejected"
			quote.AcceptedAt = nil
			quote.RejectedAt = &now
			to = "cancelled"
		}
		if err := tx.Save(&quote).Error; err != nil {
			return err
		}
		return NewCommissionFSM(tx).Transition(&commission, to, userID, "Customer quote decision")
	})
	return &commission, err
}
func (s *QuoteService) GetQuotesByCommission(id uint64) ([]model.Quote, error) {
	quotes := []model.Quote{}
	err := s.db.Where("commission_id = ? AND status <> ?", id, "draft").Order("version DESC").Find(&quotes).Error
	return quotes, err
}
func (s *QuoteService) ExpireOldQuotes() error {
	return s.db.Model(&model.Quote{}).Where("status = ? AND expires_at < ?", "sent", time.Now()).Update("status", "expired").Error
}
