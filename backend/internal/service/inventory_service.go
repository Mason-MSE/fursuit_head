package service

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/model"
)

type InventoryService struct {
	db *gorm.DB
}

func NewInventoryService(db *gorm.DB) *InventoryService {
	return &InventoryService{db: db}
}

func (s *InventoryService) ReserveStock(tx *gorm.DB, variantID uint64, quantity int, referenceType string, referenceID uint64) error {
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	var variant model.ProductVariant
	if err := tx.First(&variant, variantID).Error; err != nil {
		return fmt.Errorf("variant not found")
	}

	if variant.AvailableStock() < quantity {
		return fmt.Errorf("insufficient stock for variant %d: available %d, requested %d", variantID, variant.AvailableStock(), quantity)
	}

	result := tx.Model(&model.ProductVariant{}).
		Where("id = ? AND stock_on_hand - stock_reserved >= ?", variantID, quantity).
		Update("stock_reserved", gorm.Expr("stock_reserved + ?", quantity))
	if result.RowsAffected == 0 {
		return fmt.Errorf("insufficient stock for variant %d (concurrent modification)", variantID)
	}
	if result.Error != nil {
		return result.Error
	}

	movement := model.StockMovement{
		VariantID:     variantID,
		Type:          "reserved",
		Quantity:      quantity,
		ReferenceType: referenceType,
		ReferenceID:   &referenceID,
		Note:          fmt.Sprintf("Reserved %d units", quantity),
	}
	if err := tx.Create(&movement).Error; err != nil {
		return err
	}

	return nil
}

func (s *InventoryService) ReleaseStock(tx *gorm.DB, variantID uint64, quantity int, referenceType string, referenceID uint64) error {
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	result := tx.Model(&model.ProductVariant{}).
		Where("id = ? AND stock_reserved >= ?", variantID, quantity).
		Update("stock_reserved", gorm.Expr("stock_reserved - ?", quantity))
	if result.RowsAffected == 0 {
		return fmt.Errorf("cannot release stock: reserved amount insufficient for variant %d", variantID)
	}
	if result.Error != nil {
		return result.Error
	}

	movement := model.StockMovement{
		VariantID:     variantID,
		Type:          "released",
		Quantity:      -quantity,
		ReferenceType: referenceType,
		ReferenceID:   &referenceID,
		Note:          fmt.Sprintf("Released %d units", quantity),
	}
	if err := tx.Create(&movement).Error; err != nil {
		return err
	}

	return nil
}

func (s *InventoryService) ConfirmStock(tx *gorm.DB, variantID uint64, quantity int, referenceType string, referenceID uint64) error {
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}

	var variant model.ProductVariant
	if err := tx.First(&variant, variantID).Error; err != nil {
		return fmt.Errorf("variant not found")
	}

	if variant.StockReserved < quantity {
		return fmt.Errorf("insufficient reserved stock for variant %d: reserved %d, requested %d", variantID, variant.StockReserved, quantity)
	}

	result := tx.Model(&model.ProductVariant{}).
		Where("id = ? AND stock_reserved >= ?", variantID, quantity).
		Updates(map[string]interface{}{
			"stock_on_hand":  gorm.Expr("stock_on_hand - ?", quantity),
			"stock_reserved": gorm.Expr("stock_reserved - ?", quantity),
		})
	if result.RowsAffected == 0 {
		return fmt.Errorf("failed to confirm stock for variant %d (concurrent modification)", variantID)
	}
	if result.Error != nil {
		return result.Error
	}

	movement := model.StockMovement{
		VariantID:     variantID,
		Type:          "sold",
		Quantity:      -quantity,
		ReferenceType: referenceType,
		ReferenceID:   &referenceID,
		Note:          fmt.Sprintf("Confirmed sale of %d units", quantity),
	}
	if err := tx.Create(&movement).Error; err != nil {
		return err
	}

	return nil
}

func (s *InventoryService) AdjustStock(variantID uint64, quantity int, note string, actorID uint64) error {
	if quantity == 0 {
		return fmt.Errorf("adjustment quantity cannot be zero")
	}

	variantIDPtr := variantID
	movement := model.StockMovement{
		VariantID:     variantID,
		Type:          "adjustment",
		Quantity:      quantity,
		ReferenceType: "manual",
		ReferenceID:   &variantIDPtr,
		Note:          note,
		CreatedBy:     &actorID,
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&model.ProductVariant{}).
			Where("id = ? AND stock_on_hand + ? >= stock_reserved", variantID, quantity).
			Update("stock_on_hand", gorm.Expr("stock_on_hand + ?", quantity))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("variant %d not found", variantID)
		}

		if err := tx.Create(&movement).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *InventoryService) CheckAvailability(variantID uint64, quantity int) bool {
	var variant model.ProductVariant
	if err := s.db.First(&variant, variantID).Error; err != nil {
		return false
	}
	return variant.AvailableStock() >= quantity
}
