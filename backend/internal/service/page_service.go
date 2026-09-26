package service

import (
	"fmt"
	"math"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type PageService struct {
	db *gorm.DB
}

func NewPageService(db *gorm.DB) *PageService {
	return &PageService{db: db}
}

func (s *PageService) GetPage(slug string) (*model.Page, error) {
	var page model.Page
	if err := s.db.Where("slug = ? AND status = ?", slug, "published").First(&page).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("page not found")
		}
		return nil, err
	}
	return &page, nil
}

func (s *PageService) ListPages(page, pageSize int, status string) (*dto.PaginatedResponse, error) {
	var pages []model.Page
	var total int64

	query := s.db.Model(&model.Page{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&pages).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	return &dto.PaginatedResponse{
		Data: pages, Total: total, Page: page, PageSize: pageSize, TotalPages: totalPages,
	}, nil
}

func (s *PageService) CreatePage(req dto.PageCreateRequest, createdBy uint64) (*model.Page, error) {
	var existing model.Page
	if err := s.db.Where("slug = ?", req.Slug).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("page slug already exists")
	}

	page := model.Page{
		Slug:      req.Slug,
		Title:     req.Title,
		Content:   req.Content,
		Status:    "draft",
		CreatedBy: &createdBy,
	}

	if err := s.db.Create(&page).Error; err != nil {
		return nil, err
	}

	return &page, nil
}

func (s *PageService) UpdatePage(pageID uint64, req dto.PageUpdateRequest) (*model.Page, error) {
	var page model.Page
	if err := s.db.First(&page, pageID).Error; err != nil {
		return nil, fmt.Errorf("page not found")
	}

	// Save version before applying changes
	version := model.PageVersion{
		PageID:    pageID,
		Version:   page.Version,
		Title:     page.Title,
		Content:   page.Content,
		ChangedBy: page.CreatedBy,
		CreatedAt: time.Now(),
	}
	if err := s.db.Create(&version).Error; err != nil {
		return nil, fmt.Errorf("failed to save page version: %w", err)
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Content != "" {
		updates["content"] = req.Content
	}
	if req.Status != "" {
		updates["status"] = req.Status
		if req.Status == "published" {
			updates["version"] = page.Version + 1
			now := time.Now()
			updates["published_at"] = now
		}
	}

	if err := s.db.Model(&page).Updates(updates).Error; err != nil {
		return nil, err
	}

	s.db.First(&page, pageID)
	return &page, nil
}

func (s *PageService) RollbackPage(pageID uint64, versionID uint64) error {
	var page model.Page
	if err := s.db.First(&page, pageID).Error; err != nil {
		return fmt.Errorf("page not found")
	}

	var version model.PageVersion
	if err := s.db.Where("id = ? AND page_id = ?", versionID, pageID).First(&version).Error; err != nil {
		return fmt.Errorf("version not found")
	}

	// Save current state as a new version before rollback
	currentVersion := model.PageVersion{
		PageID:    pageID,
		Version:   page.Version,
		Title:     page.Title,
		Content:   page.Content,
		ChangedBy: page.CreatedBy,
		CreatedAt: time.Now(),
	}
	if err := s.db.Create(&currentVersion).Error; err != nil {
		return fmt.Errorf("failed to save current version before rollback: %w", err)
	}

	// Apply the rollback
	rollbackUpdates := map[string]interface{}{
		"title":   version.Title,
		"content": version.Content,
		"version": page.Version + 1,
	}

	if err := s.db.Model(&page).Updates(rollbackUpdates).Error; err != nil {
		return fmt.Errorf("failed to rollback page: %w", err)
	}

	return nil
}

func (s *PageService) ApprovePage(pageID uint64) error {
	var page model.Page
	if err := s.db.First(&page, pageID).Error; err != nil {
		return fmt.Errorf("page not found")
	}

	// Valid status transitions: draft → pending_review → approved → published
	switch page.Status {
	case "draft":
		page.Status = "pending_review"
	case "pending_review":
		page.Status = "approved"
	default:
		return fmt.Errorf("cannot approve page with status '%s'; must be 'draft' or 'pending_review'", page.Status)
	}

	if err := s.db.Save(&page).Error; err != nil {
		return fmt.Errorf("failed to update page status: %w", err)
	}

	return nil
}

func (s *PageService) GetPageVersions(pageID uint64) ([]model.PageVersion, error) {
	var versions []model.PageVersion
	if err := s.db.Where("page_id = ?", pageID).
		Order("version DESC").
		Find(&versions).Error; err != nil {
		return nil, err
	}
	return versions, nil
}

func (s *PageService) GetCommissionConfig() (*model.CommissionConfig, error) {
	var config model.CommissionConfig
	if err := s.db.First(&config).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config = model.CommissionConfig{
				Status:            "closed",
				MaxSlots:          5,
				MinDepositPercent: 50,
				QuoteValidityDays: 14,
			}
			s.db.Create(&config)
			return &config, nil
		}
		return nil, err
	}
	return &config, nil
}

func (s *PageService) UpdateCommissionConfig(req dto.CommissionConfigUpdateRequest) (*model.CommissionConfig, error) {
	var config model.CommissionConfig
	if err := s.db.First(&config).Error; err != nil {
		return nil, fmt.Errorf("config not found")
	}

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.MaxSlots != nil {
		updates["max_slots"] = *req.MaxSlots
	}
	if req.WaitlistEnabled != nil {
		updates["waitlist_enabled"] = *req.WaitlistEnabled
	}
	if req.MinDepositPercent != nil {
		updates["min_deposit_percent"] = *req.MinDepositPercent
	}
	if req.QuoteValidityDays != nil {
		updates["quote_validity_days"] = *req.QuoteValidityDays
	}

	if err := s.db.Model(&config).Updates(updates).Error; err != nil {
		return nil, err
	}

	s.db.First(&config, config.ID)
	return &config, nil
}
