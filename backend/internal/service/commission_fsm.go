package service

import (
	"fmt"
	"github.com/fursuit-platform/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

var commissionAllowedTransitions = map[string][]string{
	"draft": {"submitted", "cancelled"}, "submitted": {"needs_info", "screening", "rejected"}, "needs_info": {"submitted", "cancelled"},
	"screening": {"cultural_review", "approved_for_quote", "needs_info", "rejected"}, "cultural_review": {"approved_for_quote", "needs_info", "rejected"},
	"approved_for_quote": {"quoted"}, "quoted": {"deposit_pending", "cancelled"}, "deposit_pending": {"scheduled", "cancelled"},
	"scheduled": {"design_review"}, "design_review": {"materials", "needs_revision"}, "needs_revision": {"design_review"},
	"materials": {"production"}, "production": {"customer_review"}, "customer_review": {"quality_check", "needs_revision"},
	"quality_check": {"final_payment_pending"}, "final_payment_pending": {"ready_to_ship"}, "ready_to_ship": {"shipped"}, "shipped": {"completed"},
	"on_hold": {}, "cancelled": {}, "rejected": {}, "completed": {},
}

type CommissionFSM struct{ db *gorm.DB }

func NewCommissionFSM(db *gorm.DB) *CommissionFSM { return &CommissionFSM{db: db} }
func (f *CommissionFSM) CanTransition(from, to string) bool {
	for _, next := range commissionAllowedTransitions[from] {
		if next == to {
			return true
		}
	}
	return false
}
func (f *CommissionFSM) Transition(commission *model.Commission, to string, actorID uint64, reason string) error {
	return f.db.Transaction(func(tx *gorm.DB) error {
		var current model.Commission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, commission.ID).Error; err != nil {
			return err
		}
		if current.Version != commission.Version {
			return fmt.Errorf("concurrent modification")
		}
		if !f.CanTransition(current.Status, to) {
			return fmt.Errorf("invalid commission transition from %s to %s", current.Status, to)
		}
		if to == "approved_for_quote" && current.CulturalFlag && current.CulturalDecision != "approved" && current.CulturalDecision != "conditional" {
			return fmt.Errorf("cultural reviewer approval required")
		}
		if to == "scheduled" && current.DepositReceivedCents == 0 {
			return fmt.Errorf("confirmed deposit required")
		}
		if to == "design_review" && current.MakerID == nil {
			return fmt.Errorf("assigned maker required")
		}
		if to == "ready_to_ship" && current.FinalReceivedCents == 0 {
			return fmt.Errorf("confirmed final payment required")
		}
		if to == "shipped" && current.TrackingNumber == "" {
			return fmt.Errorf("tracking number required")
		}
		if to == "needs_revision" {
			if current.RevisionCount >= 2 {
				return fmt.Errorf("included revisions exhausted; change request required")
			}
			current.RevisionCount++
		}
		from := current.Status
		current.Status = to
		current.Version++
		if err := tx.Omit("User", "Maker").Save(&current).Error; err != nil {
			return err
		}
		var actor *uint64
		if actorID != 0 {
			actor = &actorID
		}
		if err := tx.Create(&model.CommissionStatusHistory{CommissionID: current.ID, FromStatus: from, ToStatus: to, ActorID: actor, Reason: reason, Metadata: "{}"}).Error; err != nil {
			return err
		}
		if err := NewAuditService(tx).LogWithTx(tx, actor, "commissions.transition", "commissions", &current.ID, map[string]string{"status": from}, map[string]string{"status": to}, "", "", ""); err != nil {
			return err
		}
		var user model.User
		if err := tx.First(&user, current.UserID).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.EmailOutbox{To: user.Email, Subject: "Commission " + current.CommissionNumber + ": " + to, Body: "Your commission status is now " + to + ". Sign in to view your next action.", Status: "pending", CreatedAt: time.Now().UTC()}).Error; err != nil {
			return err
		}
		*commission = current
		return nil
	})
}
