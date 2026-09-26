package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/service"
)

type AddressHandler struct {
	addressService *service.AddressService
}

func NewAddressHandler(addressService *service.AddressService) *AddressHandler {
	return &AddressHandler{addressService: addressService}
}

func (h *AddressHandler) ListAddresses(c *gin.Context) {
	userID := c.GetUint64("user_id")

	addresses, err := h.addressService.ListAddresses(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    addresses,
	})
}

func (h *AddressHandler) GetAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")
	addressID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid address id"},
		})
		return
	}

	address, err := h.addressService.GetAddress(userID, addressID)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "NOT_FOUND", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    address,
	})
}

func (h *AddressHandler) CreateAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req dto.AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	address, err := h.addressService.CreateAddress(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "CREATION_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, dto.APIResponse{
		Success: true,
		Data:    address,
	})
}

func (h *AddressHandler) UpdateAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")
	addressID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid address id"},
		})
		return
	}

	var req dto.AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	address, err := h.addressService.UpdateAddress(userID, addressID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UPDATE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    address,
	})
}

func (h *AddressHandler) DeleteAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")
	addressID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INVALID_ID", Message: "invalid address id"},
		})
		return
	}

	if err := h.addressService.DeleteAddress(userID, addressID); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "DELETE_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "address deleted"},
	})
}
