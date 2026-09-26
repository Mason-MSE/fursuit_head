package service

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type AddressService struct {
	db *gorm.DB
}

func NewAddressService(db *gorm.DB) *AddressService {
	return &AddressService{db: db}
}

func (s *AddressService) ListAddresses(userID uint64) ([]model.Address, error) {
	var addresses []model.Address
	if err := s.db.Where("user_id = ?", userID).Order("is_default DESC, created_at DESC").Find(&addresses).Error; err != nil {
		return nil, err
	}
	return addresses, nil
}

func (s *AddressService) GetAddress(userID uint64, addressID uint64) (*model.Address, error) {
	var address model.Address
	if err := s.db.Where("id = ? AND user_id = ?", addressID, userID).First(&address).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("address not found")
		}
		return nil, err
	}
	return &address, nil
}

func (s *AddressService) CreateAddress(userID uint64, req dto.AddressRequest) (*model.Address, error) {
	address := model.Address{
		UserID:     userID,
		Label:      req.Label,
		FullName:   req.FullName,
		Phone:      req.Phone,
		Line1:      req.Line1,
		Line2:      req.Line2,
		City:       req.City,
		State:      req.State,
		PostalCode: req.PostalCode,
		Country:    req.Country,
		IsDefault:  req.IsDefault,
	}

	if address.Country == "" {
		address.Country = "NZ"
	}

	if address.IsDefault {
		s.db.Model(&model.Address{}).Where("user_id = ?", userID).Update("is_default", false)
	}

	if err := s.db.Create(&address).Error; err != nil {
		return nil, err
	}

	return &address, nil
}

func (s *AddressService) UpdateAddress(userID uint64, addressID uint64, req dto.AddressRequest) (*model.Address, error) {
	var address model.Address
	if err := s.db.Where("id = ? AND user_id = ?", addressID, userID).First(&address).Error; err != nil {
		return nil, fmt.Errorf("address not found")
	}

	updates := map[string]interface{}{}
	if req.Label != "" {
		updates["label"] = req.Label
	}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Line1 != "" {
		updates["line1"] = req.Line1
	}
	if req.Line2 != "" {
		updates["line2"] = req.Line2
	}
	if req.City != "" {
		updates["city"] = req.City
	}
	if req.State != "" {
		updates["state"] = req.State
	}
	if req.PostalCode != "" {
		updates["postal_code"] = req.PostalCode
	}
	if req.Country != "" {
		updates["country"] = req.Country
	}
	updates["is_default"] = req.IsDefault

	if req.IsDefault {
		s.db.Model(&model.Address{}).Where("user_id = ?", userID).Update("is_default", false)
	}

	if err := s.db.Model(&address).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &address, nil
}

func (s *AddressService) DeleteAddress(userID uint64, addressID uint64) error {
	result := s.db.Where("id = ? AND user_id = ?", addressID, userID).Delete(&model.Address{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("address not found")
	}
	return result.Error
}
