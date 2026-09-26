package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/service"
)

type CartHandler struct {
	cartService *service.CartService
}

func NewCartHandler(cartService *service.CartService) *CartHandler {
	return &CartHandler{cartService: cartService}
}

func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.GetUint64("user_id")

	cart, err := h.cartService.GetCart(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    cart,
	})
}

func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req dto.CartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	cart, err := h.cartService.AddItem(userID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "ADD_ITEM_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    cart,
	})
}

func (h *CartHandler) UpdateItem(c *gin.Context) {
	userID := c.GetUint64("user_id")
	itemID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid item id"},
		})
		return
	}

	var req struct {
		Quantity int `json:"quantity" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	cart, err := h.cartService.UpdateItem(userID, itemID, req.Quantity)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UPDATE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    cart,
	})
}

func (h *CartHandler) RemoveItem(c *gin.Context) {
	userID := c.GetUint64("user_id")
	itemID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid item id"},
		})
		return
	}

	cart, err := h.cartService.RemoveItem(userID, itemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "REMOVE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    cart,
	})
}
