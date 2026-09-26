package service

import (
	"fmt"
	"github.com/fursuit-platform/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

type CommissionPayment struct {
	ID           uint64    `gorm:"primaryKey" json:"id"`
	CommissionID uint64    `json:"commission_id"`
	Type         string    `json:"type"`
	AmountCents  uint64    `json:"amount_cents"`
	Reference    string    `json:"reference"`
	ConfirmedBy  uint64    `json:"confirmed_by"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *CommissionService) Advance(id, actor uint64, to, reason, tracking string) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, id).Error; err != nil {
			return err
		}
		switch to {
		case "submitted", "quoted", "deposit_pending", "scheduled", "materials", "quality_check", "ready_to_ship":
			return fmt.Errorf("dedicated customer, quote or payment action required")
		}
		if to == "shipped" {
			if tracking == "" {
				return fmt.Errorf("tracking number required")
			}
			commission.TrackingNumber = tracking
			if err := tx.Model(&commission).Update("tracking_number", tracking).Error; err != nil {
				return err
			}
		}
		if (to == "needs_info" || to == "rejected" || to == "cancelled") && reason == "" {
			return fmt.Errorf("reason required")
		}
		return NewCommissionFSM(tx).Transition(&commission, to, actor, reason)
	})
	return &commission, err
}
func (s *CommissionService) CustomerApprove(id, user uint64, approve bool, reason string) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND user_id = ?", id, user).First(&commission).Error; err != nil {
			return fmt.Errorf("commission not found")
		}
		to := ""
		switch commission.Status {
		case "design_review":
			to = "materials"
		case "customer_review":
			to = "quality_check"
		default:
			return fmt.Errorf("no customer approval is pending")
		}
		if !approve {
			if reason == "" {
				return fmt.Errorf("revision reason required")
			}
			to = "needs_revision"
		}
		return NewCommissionFSM(tx).Transition(&commission, to, user, reason)
	})
	commission.InternalNotes = ""
	commission.CulturalNotes = ""
	return &commission, err
}
func (s *CommissionService) ConfirmCommissionPayment(id, actor, amount uint64, kind, reference string) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if reference == "" {
			return fmt.Errorf("bank reference required")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, id).Error; err != nil {
			return err
		}
		var previous CommissionPayment
		if err := tx.Where("commission_id = ? AND type = ?", id, kind).First(&previous).Error; err == nil {
			if previous.AmountCents == amount && previous.Reference == reference {
				return nil
			}
			return fmt.Errorf("payment already confirmed")
		}
		var quote model.Quote
		if err := tx.Where("commission_id = ? AND status = ?", id, "accepted").First(&quote).Error; err != nil {
			return fmt.Errorf("accepted quote required")
		}
		expected, state, to, field := quote.DepositAmountCents, "deposit_pending", "scheduled", "deposit_received_cents"
		if kind == "final" {
			expected = quote.TotalCents - quote.DepositAmountCents
			state = "final_payment_pending"
			to = "ready_to_ship"
			field = "final_received_cents"
		} else if kind != "deposit" {
			return fmt.Errorf("invalid payment stage")
		}
		if commission.Status != state || amount != expected {
			return fmt.Errorf("payment stage or amount mismatch: expected %d NZD cents", expected)
		}
		if err := tx.Create(&CommissionPayment{CommissionID: id, Type: kind, AmountCents: amount, Reference: reference, ConfirmedBy: actor}).Error; err != nil {
			return err
		}
		if err := tx.Model(&commission).Update(field, amount).Error; err != nil {
			return err
		}
		return NewCommissionFSM(tx).Transition(&commission, to, actor, "Bank transfer confirmed")
	})
	return &commission, err
}
func (s *CommissionService) DecideCulture(id, actor uint64, decision, reason string) (*model.Commission, error) {
	var commission model.Commission
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if reason == "" {
			return fmt.Errorf("review evidence and explanation required")
		}
		if decision != "approved" && decision != "conditional" && decision != "rejected" {
			return fmt.Errorf("invalid cultural decision")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&commission, id).Error; err != nil {
			return err
		}
		if commission.Status != "cultural_review" {
			return fmt.Errorf("cultural review is not pending")
		}
		before := commission.CulturalDecision
		commission.CulturalDecision = decision
		commission.CulturalNotes = reason
		if err := tx.Model(&commission).Updates(map[string]interface{}{"cultural_decision": decision, "cultural_notes": reason}).Error; err != nil {
			return err
		}
		return NewAuditService(tx).LogWithTx(tx, &actor, "cultural_reviews.decide", "commissions", &id, map[string]string{"decision": before}, map[string]string{"decision": decision, "reason": reason}, "", "", "")
	})
	return &commission, err
}
