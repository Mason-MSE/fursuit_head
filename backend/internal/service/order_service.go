package service

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
	"math"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type OrderService struct {
	db               *gorm.DB
	inventoryService *InventoryService
	orderFSM         *OrderFSM
}

func NewOrderService(db *gorm.DB, inventoryService *InventoryService) *OrderService {
	return &OrderService{
		db:               db,
		inventoryService: inventoryService,
		orderFSM:         NewOrderFSM(db),
	}
}

func (s *OrderService) CreateOrder(userID uint64, req dto.OrderCreateRequest) (*model.Order, error) {
	scopedKey := ""
	if req.IdempotencyKey != "" {
		scopedKey = fmt.Sprintf("order:%d:%x", userID, sha256.Sum256([]byte(req.IdempotencyKey)))
	}
	var order *model.Order

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Per-customer lock serializes cart checkout and idempotency replay.
		var user model.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			return err
		}
		if user.Status != "active" || user.EmailVerifiedAt == nil {
			return fmt.Errorf("verified account required")
		}
		if scopedKey != "" {
			var record model.IdempotencyRecord
			if err := tx.Where("`key` = ? AND user_id = ? AND expires_at > ?", scopedKey, userID, time.Now()).First(&record).Error; err == nil {
				var number string
				if err := json.Unmarshal([]byte(record.Response), &number); err != nil {
					return err
				}
				order = &model.Order{}
				return tx.Preload("Items").Where("order_number = ? AND user_id = ?", number, userID).First(order).Error
			} else if err != gorm.ErrRecordNotFound {
				return err
			}
		}
		var address model.Address
		if err := tx.Where("id = ? AND user_id = ?", req.ShippingAddressID, userID).First(&address).Error; err != nil {
			return fmt.Errorf("address not found")
		}
		addressJSON, err := json.Marshal(address)
		if err != nil {
			return err
		}

		var cart model.Cart
		if err := tx.Where("user_id = ?", userID).Preload("Items.Variant").First(&cart).Error; err != nil {
			return fmt.Errorf("cart is empty")
		}

		if len(cart.Items) == 0 {
			return fmt.Errorf("cart is empty")
		}

		orderNumber, err := s.generateOrderNumber(tx)
		if err != nil {
			return err
		}

		var subtotalCents uint64
		var taxCents uint64

		var orderItems []model.OrderItem
		for _, item := range cart.Items {
			if item.Variant == nil {
				var v model.ProductVariant
				if err := tx.First(&v, item.VariantID).Error; err != nil {
					return fmt.Errorf("variant %d not found", item.VariantID)
				}
				item.Variant = &v
			}

			var product model.Product
			if err := tx.Where("id = (SELECT product_id FROM product_variants WHERE id = ?)", item.VariantID).First(&product).Error; err != nil {
				return fmt.Errorf("product not found for variant %d", item.VariantID)
			}

			if product.Status != "published" || product.DeletedAt != nil || !item.Variant.IsActive || item.Quantity < 1 {
				return fmt.Errorf("product is unavailable")
			}
			unitPrice := item.Variant.PriceCents

			lineTotal := unitPrice * uint64(item.Quantity)
			lineTax := uint64(float64(lineTotal) * product.GSTRate / 100.0)

			subtotalCents += lineTotal
			taxCents += lineTax

			orderItems = append(orderItems, model.OrderItem{
				VariantID:      item.VariantID,
				ProductName:    product.Name,
				VariantName:    item.Variant.Name,
				SKU:            item.Variant.SKU,
				Quantity:       item.Quantity,
				UnitPriceCents: unitPrice,
				TaxRate:        product.GSTRate,
				TotalCents:     lineTotal,
			})
		}

		totalCents := subtotalCents + taxCents

		order = &model.Order{
			OrderNumber:             orderNumber,
			ShippingAddressSnapshot: string(addressJSON),
			UserID:                  userID,
			Status:                  "awaiting_payment",
			SubtotalCents:           subtotalCents,
			TaxCents:                taxCents,
			TotalCents:              totalCents,
			Currency:                "NZD",
			ShippingAddressID:       &req.ShippingAddressID,
			ShippingMethod:          req.ShippingMethod,
			Notes:                   req.Notes,
		}

		if err := tx.Create(order).Error; err != nil {
			return err
		}

		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if err := tx.Create(&orderItems).Error; err != nil {
			return err
		}

		for _, item := range orderItems {
			if err := s.inventoryService.ReserveStock(tx, item.VariantID, item.Quantity, "order", order.ID); err != nil {
				return fmt.Errorf("failed to reserve stock for variant %d: %w", item.VariantID, err)
			}
		}

		if err := tx.Where("cart_id = ?", cart.ID).Delete(&model.CartItem{}).Error; err != nil {
			return err
		}

		if scopedKey != "" {
			response, _ := json.Marshal(order.OrderNumber)
			if err := tx.Where("`key` = ? AND expires_at <= ?", scopedKey, time.Now()).Delete(&model.IdempotencyRecord{}).Error; err != nil {
				return err
			}
			if err := tx.Create(&model.IdempotencyRecord{Key: scopedKey, UserID: userID, Response: string(response), ExpiresAt: time.Now().Add(24 * time.Hour)}).Error; err != nil {
				return err
			}
		}
		if err := tx.Create(&model.EmailOutbox{To: user.Email, Subject: "Order " + order.OrderNumber, Body: fmt.Sprintf("Order received. Bank transfer payment due: %d cents %s. Reference: %s", order.TotalCents, order.Currency, order.OrderNumber), Status: "pending"}).Error; err != nil {
			return err
		}
		order.Items = orderItems
		return nil
	})

	if err != nil {
		return nil, err
	}

	return order, nil
}

func (s *OrderService) GetOrder(userID uint64, orderID uint64) (*model.Order, error) {
	var order model.Order
	if err := s.db.Preload("Items").Preload("History").Preload("Payments").Preload("User").
		First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}

	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	order.InternalNotes = ""
	order.AllowedActions = []string{}
	if order.Status == "awaiting_payment" {
		order.AllowedActions = []string{"cancel", "upload_receipt"}
	}
	order.User = nil

	return &order, nil
}

func (s *OrderService) ListOrders(page, pageSize int, status string, userID *uint64) (*dto.PaginatedResponse, error) {
	var orders []model.Order
	var total int64

	query := s.db.Model(&model.Order{})

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Items").Preload("Payments").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&orders).Error; err != nil {
		return nil, err
	}

	if userID != nil {
		for i := range orders {
			orders[i].InternalNotes = ""
			orders[i].User = nil
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       orders,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *OrderService) UpdateOrderStatus(orderID uint64, req dto.OrderStatusUpdateRequest, actorID uint64) (*model.Order, error) {
	var order model.Order
	if err := s.db.First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}
	// Money can only be confirmed by the payment service, never a generic status edit.
	if req.Status == "paid" || req.Status == "refunded" || req.Status == "refund_pending" {
		return nil, fmt.Errorf("payment or refund workflow required")
	}
	order.TrackingNumber = req.TrackingNumber
	if err := s.orderFSM.Transition(&order, req.Status, actorID, req.Reason); err != nil {
		return nil, err
	}
	return &order, nil
}
func (s *OrderService) CancelOrder(userID, orderID uint64, reason string) (*model.Order, error) {
	var order model.Order
	if err := s.db.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}
	if order.Status == "cancelled" {
		return &order, nil
	}
	if err := s.orderFSM.CancelOrder(&order, userID, reason); err != nil {
		return nil, err
	}
	return &order, nil
}

func (s *OrderService) generateOrderNumber(tx *gorm.DB) (string, error) {
	return "ORD-" + time.Now().UTC().Format("20060102") + "-" + uuid.NewString()[:12], nil
}
