package service

import (
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
	"math"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type PaymentService struct {
	db *gorm.DB
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	return &PaymentService{db: db}
}

func (s *PaymentService) UploadReceipt(userID uint64, req dto.BankTransferUploadRequest) (*model.Payment, error) {
	var order model.Order
	if err := s.db.First(&order, req.OrderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	if order.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}

	paymentNumber, err := s.generatePaymentNumber()
	if err != nil {
		return nil, err
	}

	payment := model.Payment{
		PaymentNumber:   paymentNumber,
		OrderID:         req.OrderID,
		Type:            "full",
		Method:          "bank_transfer",
		Status:          "pending",
		AmountCents:     req.AmountCents,
		Currency:        "NZD",
		ReceiptURL:      req.ReceiptURL,
		ReceiptFilename: req.ReceiptFilename,
		BankReference:   req.BankReference,
	}

	if err := s.db.Create(&payment).Error; err != nil {
		return nil, err
	}

	return &payment, nil
}

func (s *PaymentService) ListPayments(page, pageSize int, orderID *uint64, ownerID ...uint64) (*dto.PaginatedResponse, error) {
	var payments []model.Payment
	var total int64

	query := s.db.Model(&model.Payment{})
	if len(ownerID) > 0 {
		query = query.Where("order_id IN (?)", s.db.Model(&model.Order{}).Select("id").Where("user_id = ?", ownerID[0]))
	}

	if orderID != nil {
		query = query.Where("order_id = ?", *orderID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&payments).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       payments,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *PaymentService) ConfirmPayment(paymentID uint64, req dto.PaymentConfirmRequest, actorID uint64) (*model.Payment, error) {
	var payment model.Payment
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payment, paymentID).Error; err != nil {
			return fmt.Errorf("payment not found")
		}
		if payment.Status == req.Status && payment.ConfirmedAt != nil {
			return nil
		}
		if payment.Status != "pending" && payment.Status != "amount_mismatch" {
			return fmt.Errorf("payment already finalized")
		}
		if req.Status != "completed" && req.Status != "rejected" && req.Status != "amount_mismatch" {
			return fmt.Errorf("invalid payment status")
		}
		var order model.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, payment.OrderID).Error; err != nil {
			return err
		}
		if order.Status != "awaiting_payment" {
			return fmt.Errorf("order is not awaiting payment")
		}
		before := payment.Status
		payment.Status = req.Status
		if req.Status == "completed" && (payment.AmountCents != order.TotalCents || payment.Currency != order.Currency) {
			payment.Status = "amount_mismatch"
		}
		now := time.Now().UTC()
		payment.ConfirmedAt = &now
		payment.ConfirmedBy = &actorID
		payment.Notes = req.Notes
		if err := tx.Save(&payment).Error; err != nil {
			return err
		}
		if payment.Status == "completed" {
			if err := NewOrderFSM(tx).Transition(&order, "paid", actorID, "Bank transfer confirmed"); err != nil {
				return err
			}
		}
		return NewAuditService(tx).LogWithTx(tx, &actorID, "payments.confirm", "payments", &payment.ID, map[string]string{"status": before}, map[string]interface{}{"status": payment.Status, "amount_cents": payment.AmountCents}, "", "", "")
	})
	return &payment, err
}

func (s *PaymentService) GetPaymentsByOrder(orderID uint64) ([]model.Payment, error) {
	var payments []model.Payment
	if err := s.db.Where("order_id = ?", orderID).
		Order("created_at DESC").
		Find(&payments).Error; err != nil {
		return nil, err
	}
	return payments, nil
}

func (s *PaymentService) generatePaymentNumber() (string, error) {
	return "PAY-" + time.Now().UTC().Format("20060102") + "-" + uuid.NewString()[:12], nil
}

func (s *PaymentService) ExpireStalePendingPayments() error {
	cutoff := time.Now().Add(-48 * time.Hour)

	var payments []model.Payment
	if err := s.db.Where("status = ? AND created_at < ?", "pending", cutoff).Find(&payments).Error; err != nil {
		return err
	}

	for _, payment := range payments {
		payment.Status = "cancelled"
		payment.Notes = "Auto-cancelled: pending payment exceeded 48h timeout"
		if err := s.db.Save(&payment).Error; err != nil {
			continue
		}

		var order model.Order
		if err := s.db.First(&order, payment.OrderID).Error; err == nil {
			if order.Status == "pending" {
				order.Status = "cancelled"
				order.InternalNotes += "\n[Auto-cancelled] Associated payment expired after 48h"
				s.db.Save(&order)
			}
		}
	}

	return nil
}
