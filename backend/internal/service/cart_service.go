package service

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type CartService struct {
	db *gorm.DB
}

func NewCartService(db *gorm.DB) *CartService {
	return &CartService{db: db}
}

func (s *CartService) GetCart(userID uint64) (*model.Cart, error) {
	var cart model.Cart
	err := s.db.Where("user_id = ?", userID).Preload("Items.Variant").First(&cart).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			cart = model.Cart{UserID: userID}
			if createErr := s.db.Create(&cart).Error; createErr != nil {
				return nil, createErr
			}
			cart.Items = []model.CartItem{}
			return &cart, nil
		}
		return nil, err
	}
	return &cart, nil
}

func (s *CartService) AddItem(userID uint64, req dto.CartItemRequest) (*model.Cart, error) {
	cart, err := s.GetCart(userID)
	if err != nil {
		return nil, err
	}

	var variant model.ProductVariant
	if err := s.db.First(&variant, req.VariantID).Error; err != nil {
		return nil, fmt.Errorf("variant not found")
	}

	if !variant.IsActive {
		return nil, fmt.Errorf("variant is not available")
	}

	available := variant.StockOnHand - variant.StockReserved
	if available < req.Quantity {
		return nil, fmt.Errorf("insufficient stock, available: %d", available)
	}

	var existingItem model.CartItem
	err = s.db.Where("cart_id = ? AND variant_id = ?", cart.ID, req.VariantID).First(&existingItem).Error
	if err == nil {
		existingItem.Quantity += req.Quantity
		existingItem.PriceCentsSnapshot = variant.PriceCents
		s.db.Save(&existingItem)
	} else {
		item := model.CartItem{
			CartID:             cart.ID,
			VariantID:          req.VariantID,
			Quantity:           req.Quantity,
			PriceCentsSnapshot: variant.PriceCents,
		}
		if err := s.db.Create(&item).Error; err != nil {
			return nil, err
		}
	}

	s.db.Preload("Items.Variant").First(cart, cart.ID)
	return cart, nil
}

func (s *CartService) UpdateItem(userID uint64, itemID uint64, quantity int) (*model.Cart, error) {
	cart, err := s.GetCart(userID)
	if err != nil {
		return nil, err
	}

	var item model.CartItem
	if err := s.db.Where("id = ? AND cart_id = ?", itemID, cart.ID).First(&item).Error; err != nil {
		return nil, fmt.Errorf("cart item not found")
	}

	if quantity <= 0 {
		return s.RemoveItem(userID, itemID)
	}

	var variant model.ProductVariant
	if err := s.db.First(&variant, item.VariantID).Error; err != nil {
		return nil, fmt.Errorf("variant not found")
	}

	available := variant.StockOnHand - variant.StockReserved
	if available < quantity {
		return nil, fmt.Errorf("insufficient stock, available: %d", available)
	}

	item.Quantity = quantity
	item.PriceCentsSnapshot = variant.PriceCents
	s.db.Save(&item)

	s.db.Preload("Items.Variant").First(cart, cart.ID)
	return cart, nil
}

func (s *CartService) RemoveItem(userID uint64, itemID uint64) (*model.Cart, error) {
	cart, err := s.GetCart(userID)
	if err != nil {
		return nil, err
	}

	var item model.CartItem
	if err := s.db.Where("id = ? AND cart_id = ?", itemID, cart.ID).First(&item).Error; err != nil {
		return nil, fmt.Errorf("cart item not found")
	}

	s.db.Delete(&item)

	s.db.Preload("Items.Variant").First(cart, cart.ID)
	return cart, nil
}
