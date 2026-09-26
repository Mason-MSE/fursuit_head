package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	user, err := h.authService.Register(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "REGISTRATION_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, dto.APIResponse{
		Success: true,
		Data:    user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	userAgent := c.GetHeader("User-Agent")
	ip := c.ClientIP()

	resp, err := h.authService.Login(req, userAgent, ip)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "LOGIN_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    resp,
	})
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		var req dto.VerifyEmailRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, dto.APIResponse{
				Success: false,
				Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: "token is required"},
			})
			return
		}
		token = req.Token
	}

	if err := h.authService.VerifyEmail(token); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VERIFICATION_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Email verified successfully"},
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UNAUTHORIZED", Message: "user not found in context"},
		})
		return
	}

	userID, ok := userIDVal.(uint64)
	if !ok {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: "invalid user id type"},
		})
		return
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "NOT_FOUND", Message: err.Error()},
		})
		return
	}

	roleResp := make([]dto.RoleResponse, 0, len(user.Roles))
	permSet := make(map[string]bool)
	permCodes := make([]string, 0)

	for _, role := range user.Roles {
		rolePerms := make([]string, 0, len(role.Permissions))
		for _, p := range role.Permissions {
			rolePerms = append(rolePerms, p.Code)
			if !permSet[p.Code] {
				permSet[p.Code] = true
				permCodes = append(permCodes, p.Code)
			}
		}
		roleResp = append(roleResp, dto.RoleResponse{
			ID:          role.ID,
			Code:        role.Code,
			Name:        role.Name,
			IsSystem:    role.IsSystem,
			Permissions: rolePerms,
		})
	}

	var emailVerifiedAt *string
	if user.EmailVerifiedAt != nil {
		s := user.EmailVerifiedAt.Format("2006-01-02T15:04:05Z")
		emailVerifiedAt = &s
	}

	userResp := dto.UserResponse{
		ID:               user.ID,
		Email:            user.Email,
		FullName:         user.FullName,
		Status:           user.Status,
		EmailVerifiedAt:  emailVerifiedAt,
		MarketingConsent: user.MarketingConsent,
		Roles:            roleResp,
		Permissions:      permCodes,
		CreatedAt:        user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    userResp,
	})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if err := h.authService.ForgotPassword(req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "If the email exists, a reset link has been sent"},
	})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if req.Password != req.PasswordConfirm {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: "passwords do not match"},
		})
		return
	}

	if err := h.authService.ResetPassword(req.Token, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "RESET_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Password reset successfully"},
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	accessToken, refreshToken, err := h.authService.RefreshAccessToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "TOKEN_REFRESH_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data: gin.H{
			"token":         accessToken,
			"refresh_token": refreshToken,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req dto.LogoutRequest
	_ = c.ShouldBindJSON(&req)

	if req.RefreshToken != "" {
		_ = h.authService.RevokeRefreshToken(req.RefreshToken)
	}

	userIDVal, exists := c.Get("user_id")
	if exists {
		if userID, ok := userIDVal.(uint64); ok {
			_ = h.authService.RevokeAllUserSessions(userID)
		}
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Logged out successfully"},
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "UNAUTHORIZED", Message: "user not found in context"},
		})
		return
	}

	userID, ok := userIDVal.(uint64)
	if !ok {
		c.JSON(http.StatusInternalServerError, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "INTERNAL_ERROR", Message: "invalid user id type"},
		})
		return
	}

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: err.Error()},
		})
		return
	}

	if req.Password != req.PasswordConfirm {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "VALIDATION_ERROR", Message: "passwords do not match"},
		})
		return
	}

	if err := h.authService.ChangePassword(userID, req.OldPassword, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, dto.APIResponse{
			Success: false,
			Error:   &dto.APIError{Code: "CHANGE_PASSWORD_FAILED", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, dto.APIResponse{
		Success: true,
		Data:    gin.H{"message": "Password changed successfully"},
	})
}

func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	resp, err := h.authService.Login(req, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.APIResponse{Error: &dto.APIError{Code: "LOGIN_FAILED", Message: "Invalid email or password"}})
		return
	}
	allowed := false
	for _, p := range resp.User.Permissions {
		if p == "auth.admin_login" {
			allowed = true
		}
	}
	if !allowed {
		_ = h.authService.RevokeRefreshToken(resp.RefreshToken)
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	c.JSON(http.StatusOK, dto.APIResponse{Success: true, Data: resp})
}
