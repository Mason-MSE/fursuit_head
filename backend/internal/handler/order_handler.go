package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/middleware"
	"github.com/fursuit-platform/backend/internal/service"
)

type OrderHandler struct {
	orderService *service.OrderService
}

func NewOrderHandler(orderService *service.OrderService) *OrderHandler {
	return &OrderHandler{orderService: orderService}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req dto.OrderCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if key := c.GetHeader("Idempotency-Key"); key != "" {
		req.IdempotencyKey = key
	}
	order, err := h.orderService.CreateOrder(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "ORDER_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, dto.APIResponse{
		Success: true,
		Data:    order,
	})
}

func (h *OrderHandler) ListMyOrders(c *gin.Context) {
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

	resp, err := h.orderService.ListOrders(page, pageSize, status, &userID)
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

func (h *OrderHandler) GetMyOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid order id"},
		})
		return
	}

	order, err := h.orderService.GetOrder(userID, orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "NOT_FOUND", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    order,
	})
}

func (h *OrderHandler) ListAdminOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	resp, err := h.orderService.ListOrders(page, pageSize, status, nil)
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

func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	actorID := c.GetUint64("user_id")
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid order id"},
		})
		return
	}

	var req dto.OrderStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if req.Status == "shipped" && !middleware.HasPermission(c, "orders.ship") {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	order, err := h.orderService.UpdateOrderStatus(orderID, req, actorID)
	if err != nil {
		c.JSON(http.StatusConflict, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UPDATE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    order,
	})
}

func (h *OrderHandler) CancelMyOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if _, err := h.orderService.GetOrder(c.GetUint64("user_id"), id); err != nil {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	order, err := h.orderService.CancelOrder(c.GetUint64("user_id"), id, req.Reason)
	if err != nil {
		c.JSON(http.StatusConflict, dto.APIResponse{Error: &dto.APIError{Code: "CONFLICT", Message: err.Error()}})
		return
	}
	c.JSON(http.StatusOK, dto.APIResponse{Success: true, Data: order})
}
