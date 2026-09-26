package service

import (
	"fmt"
	"github.com/fursuit-platform/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

var orderAllowedTransitions = map[string][]string{
	"awaiting_payment": {"paid", "cancelled"}, "paid": {"processing"},
	"processing": {"ready_to_ship"}, "ready_to_ship": {"shipped"},
	"shipped": {"delivered"}, "delivered": {"completed"},
	"completed": {}, "cancelled": {}, "refund_pending": {"refunded"}, "refunded": {},
}

type OrderFSM struct{ db *gorm.DB }

func NewOrderFSM(db *gorm.DB) *OrderFSM { return &OrderFSM{db: db} }
func (f *OrderFSM) CanTransition(from, to string) bool {
	for _, next := range orderAllowedTransitions[from] {
		if next == to {
			return true
		}
	}
	return false
}
func (f *OrderFSM) Transition(order *model.Order, to string, actorID uint64, reason string) error {
	return f.db.Transaction(func(tx *gorm.DB) error {
		var current model.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&current, order.ID).Error; err != nil {
			return err
		}
		if current.Version != order.Version {
			return fmt.Errorf("concurrent modification")
		}
		if !f.CanTransition(current.Status, to) {
			return fmt.Errorf("invalid status transition from %s to %s", current.Status, to)
		}
		if to == "paid" {
			var paid uint64
			if err := tx.Model(&model.Payment{}).Where("order_id = ? AND status = ?", current.ID, "completed").Select("COALESCE(SUM(amount_cents),0)").Scan(&paid).Error; err != nil {
				return err
			}
			if paid != current.TotalCents {
				return fmt.Errorf("confirmed payment required")
			}
		}
		if to == "cancelled" {
			var n int64
			tx.Model(&model.Payment{}).Where("order_id = ? AND status = ?", current.ID, "completed").Count(&n)
			if n > 0 {
				return fmt.Errorf("paid orders require refund workflow")
			}
			if reason == "" {
				return fmt.Errorf("cancellation reason required")
			}
			for _, item := range current.Items {
				if err := NewInventoryService(tx).ReleaseStock(tx, item.VariantID, item.Quantity, "order", current.ID); err != nil {
					return err
				}
			}
		}
		if to == "shipped" {
			if order.TrackingNumber == "" {
				return fmt.Errorf("tracking number required")
			}
			current.TrackingNumber = order.TrackingNumber
			now := time.Now().UTC()
			current.ShippedAt = &now
			for _, item := range current.Items {
				if err := NewInventoryService(tx).ConfirmStock(tx, item.VariantID, item.Quantity, "order", current.ID); err != nil {
					return err
				}
			}
		}
		if to == "delivered" {
			now := time.Now().UTC()
			current.DeliveredAt = &now
		}
		from := current.Status
		current.Status = to
		current.Version++
		if err := tx.Omit("Items").Save(&current).Error; err != nil {
			return err
		}
		var actor *uint64
		if actorID != 0 {
			actor = &actorID
		}
		if err := tx.Create(&model.OrderStatusHistory{OrderID: current.ID, FromStatus: from, ToStatus: to, ActorID: actor, Reason: reason, Metadata: "{}"}).Error; err != nil {
			return err
		}
		if err := NewAuditService(tx).LogWithTx(tx, actor, "orders.transition", "orders", &current.ID, map[string]string{"status": from}, map[string]string{"status": to}, "", "", ""); err != nil {
			return err
		}
		var user model.User
		if err := tx.First(&user, current.UserID).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.EmailOutbox{To: user.Email, Subject: "Order " + current.OrderNumber + ": " + to, Body: fmt.Sprintf("Your order status is %s. Tracking: %s", to, current.TrackingNumber), Status: "pending"}).Error; err != nil {
			return err
		}
		*order = current
		return nil
	})
}
func (f *OrderFSM) CancelOrder(order *model.Order, actorID uint64, reason string) error {
	return f.Transition(order, "cancelled", actorID, reason)
}
func (f *OrderFSM) AutoExpirePendingOrders() error {
	var orders []model.Order
	if err := f.db.Where("status = ? AND created_at < ?", "awaiting_payment", time.Now().Add(-24*time.Hour)).Find(&orders).Error; err != nil {
		return err
	}
	for i := range orders {
		if err := f.CancelOrder(&orders[i], 0, "Payment deadline expired"); err != nil {
			return err
		}
	}
	return nil
}
