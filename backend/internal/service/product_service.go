package service

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type ProductService struct {
	db *gorm.DB
}

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{db: db}
}

func populateImageURL(products []model.Product) []model.Product {
	for i := range products {
		if products[i].ImageURL == "" {
			products[i].ImageURL = products[i].MainImageURL
		}
	}
	return products
}

func (s *ProductService) ListProducts(page, pageSize int, categorySlug, productType, search, status string) (*dto.PaginatedResponse, error) {
	var products []model.Product
	var total int64

	query := s.db.Model(&model.Product{}).Where("status = ? AND deleted_at IS NULL", "published")

	if categorySlug != "" {
		var cat model.Category
		if err := s.db.Where("slug = ?", categorySlug).First(&cat).Error; err != nil {
			return &dto.PaginatedResponse{
				Data:       []model.Product{},
				Total:      0,
				Page:       page,
				PageSize:   pageSize,
				TotalPages: 0,
			}, nil
		}
		query = query.Where("category_id = ?", cat.ID)
	}

	if productType != "" {
		query = query.Where("product_type = ?", productType)
	}

	if search != "" {
		query = query.Where("name LIKE ?", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Images").Preload("Variants").Preload("Category").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&products).Error; err != nil {
		return nil, err
	}

	products = populateImageURL(products)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	return &dto.PaginatedResponse{
		Data:       products,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *ProductService) GetProduct(idOrSlug string) (*model.Product, error) {
	var product model.Product
	query := s.db.Preload("Images").Preload("Variants").Preload("Category")

	err := query.Where("status = ? AND deleted_at IS NULL", "published").Where("(id = ? OR slug = ?)", idOrSlug, idOrSlug).First(&product).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("product not found")
		}
		return nil, err
	}

	if product.ImageURL == "" {
		product.ImageURL = product.MainImageURL
	}

	return &product, nil
}

func (s *ProductService) CreateProduct(req dto.ProductCreateRequest) (*model.Product, error) {
	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Name)
	}

	sku := req.SKU
	if sku == "" {
		sku = fmt.Sprintf("SKU-%s-%d", slug, time.Now().UnixMilli()%100000)
	}

	product := model.Product{
		CategoryID:       req.CategoryID,
		SKU:              sku,
		Name:             req.Name,
		Slug:             slug,
		Description:      req.Description,
		ShortDescription: req.ShortDescription,
		BasePriceCents:   req.BasePriceCents,
		Currency:         req.Currency,
		ProductType:      req.ProductType,
		Status:           "draft",
		MainImageURL:     req.MainImageURL,
		CareInstructions: req.CareInstructions,
		SafetyNotes:      req.SafetyNotes,
		EstimatedDaysMin: req.EstimatedDaysMin,
		EstimatedDaysMax: req.EstimatedDaysMax,
	}

	if product.Currency == "" {
		product.Currency = "NZD"
	}
	if product.ProductType == "" {
		product.ProductType = "ready_to_ship"
	}

	if err := s.db.Create(&product).Error; err != nil {
		return nil, err
	}

	product.ImageURL = product.MainImageURL

	return &product, nil
}

func (s *ProductService) UpdateProduct(id uint64, req dto.ProductUpdateRequest) (*model.Product, error) {
	var product model.Product
	if err := s.db.First(&product, id).Error; err != nil {
		return nil, fmt.Errorf("product not found")
	}

	updates := map[string]interface{}{}

	if req.CategoryID != nil {
		updates["category_id"] = req.CategoryID
	}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.ShortDescription != "" {
		updates["short_description"] = req.ShortDescription
	}
	if req.BasePriceCents != nil {
		updates["base_price_cents"] = req.BasePriceCents
	}
	if req.ProductType != "" {
		updates["product_type"] = req.ProductType
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.MainImageURL != "" {
		updates["main_image_url"] = req.MainImageURL
	}
	if req.CareInstructions != "" {
		updates["care_instructions"] = req.CareInstructions
	}
	if req.SafetyNotes != "" {
		updates["safety_notes"] = req.SafetyNotes
	}

	if err := s.db.Model(&product).Updates(updates).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Images").Preload("Variants").Preload("Category").First(&product, id)
	return &product, nil
}

func (s *ProductService) DeleteProduct(id uint64) error {
	var product model.Product
	if err := s.db.First(&product, id).Error; err != nil {
		return fmt.Errorf("product not found")
	}

	if err := s.db.Delete(&product).Error; err != nil {
		return err
	}

	return nil
}

func (s *ProductService) ListCategories() ([]model.Category, error) {
	var categories []model.Category
	if err := s.db.Where("is_active = ?", true).Order("sort_order ASC").Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}

func slugify(s string) string {
	s = strings.ToLower(s)
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	s = reg.ReplaceAllString(s, "")
	reg2 := regexp.MustCompile(`[\s-]+`)
	s = reg2.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "product"
	}
	return s
}
