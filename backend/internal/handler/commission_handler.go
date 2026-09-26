package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/service"
	"strings"
)

type CommissionHandler struct {
	commissionService *service.CommissionService
	quoteService      *service.QuoteService
}

func NewCommissionHandler(commissionService *service.CommissionService, quoteService *service.QuoteService) *CommissionHandler {
	return &CommissionHandler{commissionService: commissionService, quoteService: quoteService}
}

func (h *CommissionHandler) CreateCommission(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req dto.CommissionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	commission, err := h.commissionService.CreateCommission(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "CREATION_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, dto.APIResponse{
		Success: true,
		Data:    commission,
	})
}

func (h *CommissionHandler) ListMyCommissions(c *gin.Context) {
	userID := c.GetUint64("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	resp, err := h.commissionService.ListCommissions(page, pageSize, status, &userID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    resp.Data,
		Meta:    resp,
	})
}

func (h *CommissionHandler) GetMyCommission(c *gin.Context) {
	userID := c.GetUint64("user_id")
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	commission, err := h.commissionService.GetCommission(userID, commissionID)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "NOT_FOUND", Message: err.Error()},
		})
		return
	}

	quotes, _ := h.quoteService.GetQuotesByCommission(commissionID)

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data: gin.H{
			"commission": commission,
			"quotes":     quotes,
		},
	})
}

func (h *CommissionHandler) SubmitCommission(c *gin.Context) {
	userID := c.GetUint64("user_id")
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	commission, err := h.commissionService.SubmitCommission(userID, commissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "SUBMIT_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    commission,
	})
}

func (h *CommissionHandler) UpdateCommission(c *gin.Context) {
	actorID := c.GetUint64("user_id")
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	var req dto.CommissionUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if strings.HasPrefix(c.FullPath(), "/api/v1/me/") {
		own, err := h.commissionService.GetCommission(actorID, commissionID)
		if err != nil {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		if own.Status != "draft" && own.Status != "needs_info" {
			c.AbortWithStatus(http.StatusConflict)
			return
		}
		if req.InternalNotes != "" || req.MakerID != nil || req.EstimatedStart != "" || req.EstimatedEnd != "" {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}
	}
	commission, err := h.commissionService.UpdateCommission(commissionID, req, actorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UPDATE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    commission,
	})
}

func (h *CommissionHandler) ListAdminCommissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	makerIDStr := c.Query("maker_id")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var makerID *uint64
	if makerIDStr != "" {
		v, err := strconv.ParseUint(makerIDStr, 10, 64)
		if err == nil {
			makerID = &v
		}
	}

	if c.GetBool("assigned_only") {
		id := c.GetUint64("user_id")
		makerID = &id
	}
	resp, err := h.commissionService.ListCommissions(page, pageSize, status, nil, makerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    resp.Data,
		Meta:    resp,
	})
}

func (h *CommissionHandler) AssignMaker(c *gin.Context) {
	actorID := c.GetUint64("user_id")
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	var req struct {
		MakerID uint64 `json:"maker_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	commission, err := h.commissionService.AssignMaker(commissionID, req.MakerID, actorID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "ASSIGN_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    commission,
	})
}

func (h *CommissionHandler) AcceptQuote(c *gin.Context) {
	userID := c.GetUint64("user_id")
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	quoteID, err := strconv.ParseUint(c.Param("quoteId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid quote id"},
		})
		return
	}

	var req dto.QuoteAcceptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	commission, err := h.quoteService.AcceptQuote(commissionID, quoteID, userID, req.Accept)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "QUOTE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    commission,
	})
}

func (h *CommissionHandler) GetQuotes(c *gin.Context) {
	commissionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid commission id"},
		})
		return
	}

	if _, err := h.commissionService.GetCommission(c.GetUint64("user_id"), commissionID); err != nil {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	quotes, err := h.quoteService.GetQuotesByCommission(commissionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    quotes,
	})
}
