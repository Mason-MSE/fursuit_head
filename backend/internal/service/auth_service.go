package service

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/fursuit-platform/backend/internal/config"
	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
)

type EmailVerification struct {
	ID        uint64     `json:"id" gorm:"primaryKey"`
	UserID    uint64     `json:"user_id" gorm:"index"`
	Token     string     `json:"token" gorm:"uniqueIndex;size:100"`
	Type      string     `json:"type" gorm:"size:20;default:register"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
	rdb *goredis.Client
}

func NewAuthService(db *gorm.DB, cfg *config.Config, rdb *goredis.Client) *AuthService {
	return &AuthService{db: db, cfg: cfg, rdb: rdb}
}

var weakPasswords = map[string]bool{
	"password":      true,
	"123456789012":  true,
	"qwertyuiop12":  true,
	"abcdefghijk1":  true,
	"password1234":  true,
	"letmein123456": true,
	"welcome12345":  true,
	"admin1234567":  true,
	"changeme1234":  true,
}

func validatePasswordStrength(password string) error {
	if len(password) < 12 {
		return fmt.Errorf("password must be at least 12 characters")
	}

	lower := strings.ToLower(password)
	if weakPasswords[lower] {
		return fmt.Errorf("password is too common")
	}

	hasUpper, hasLower, hasDigit, hasSpecial := false, false, false, false
	for _, c := range password {
		switch {
		case c >= 'A' && c <= 'Z':
			hasUpper = true
		case c >= 'a' && c <= 'z':
			hasLower = true
		case c >= '0' && c <= '9':
			hasDigit = true
		default:
			hasSpecial = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit || !hasSpecial {
		return fmt.Errorf("password must contain uppercase, lowercase, digit, and special character")
	}

	repeatCount := 0
	var lastChar rune
	for _, c := range password {
		if c == lastChar {
			repeatCount++
			if repeatCount >= 3 {
				return fmt.Errorf("password must not contain 3 or more repeating characters")
			}
		} else {
			repeatCount = 0
			lastChar = c
		}
	}

	return nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}

func (s *AuthService) logSecurityEvent(userID *uint64, event, ipAddress, userAgent, details string) {
	encodedDetails, _ := json.Marshal(map[string]string{"message": details})
	log := model.SecurityLog{
		UserID:    userID,
		Event:     event,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Details:   string(encodedDetails),
	}
	s.db.Create(&log)
}

func (s *AuthService) isAccountLocked(user *model.User) bool {
	if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
		return true
	}
	return false
}

func (s *AuthService) Register(req dto.RegisterRequest) (*model.User, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	var existing model.User
	if err := s.db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("email already registered")
	}

	if req.Password != req.PasswordConfirm {
		return nil, fmt.Errorf("passwords do not match")
	}

	if err := validatePasswordStrength(req.Password); err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, err
	}

	user := model.User{
		Email:            req.Email,
		PasswordHash:     string(hash),
		FullName:         req.FullName,
		Status:           "pending_email",
		MarketingConsent: req.MarketingConsent,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		var customer model.Role
		if err := tx.Where("code = ?", "customer").First(&customer).Error; err != nil {
			return err
		}
		if err := tx.Model(&user).Association("Roles").Append(&customer); err != nil {
			return err
		}
		token := uuid.NewString()
		verification := EmailVerification{UserID: user.ID, Token: hashToken(token), Type: "register", ExpiresAt: time.Now().Add(24 * time.Hour)}
		if err := tx.Create(&verification).Error; err != nil {
			return err
		}
		return tx.Create(&model.EmailOutbox{To: user.Email, Subject: "Verify your email", Body: fmt.Sprintf("Verify your email: %s/verify-email?token=%s", s.cfg.FrontendURL, token), Status: "pending"}).Error
	})
	if err != nil {
		return nil, err
	}

	s.logSecurityEvent(&user.ID, "register", "", "", fmt.Sprintf("user registered: %s", user.Email))

	return &user, nil
}

func (s *AuthService) Login(req dto.LoginRequest, userAgent, ip string) (*dto.LoginResponse, error) {
	var user model.User
	if err := s.db.Preload("Roles.Permissions").Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&user).Error; err != nil {
		s.logSecurityEvent(nil, "login_failed", ip, userAgent, fmt.Sprintf("unknown email: %s", req.Email))
		return nil, fmt.Errorf("invalid email or password")
	}

	if s.isAccountLocked(&user) {
		s.logSecurityEvent(&user.ID, "login_blocked_locked", ip, userAgent, "account is locked")
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		user.FailedLoginAttempts++
		if user.FailedLoginAttempts >= s.cfg.MaxLoginAttempts {
			lockUntil := time.Now().Add(s.cfg.LockoutDuration)
			user.LockedUntil = &lockUntil
			s.logSecurityEvent(&user.ID, "account_locked", ip, userAgent,
				fmt.Sprintf("locked after %d failed attempts", user.FailedLoginAttempts))
		}
		s.db.Save(&user)
		s.logSecurityEvent(&user.ID, "login_failed", ip, userAgent, "wrong password")
		return nil, fmt.Errorf("invalid email or password")
	}

	if user.Status != "active" {
		s.logSecurityEvent(&user.ID, "login_failed_inactive", ip, userAgent, "account not active")
		return nil, fmt.Errorf("invalid email or password")
	}

	user.FailedLoginAttempts = 0
	user.LockedUntil = nil
	now := time.Now()
	user.LastLoginAt = &now
	s.db.Save(&user)

	refreshToken, err := s.GenerateRefreshToken(user.ID, userAgent, ip)
	if err != nil {
		return nil, err
	}
	var session model.RefreshToken
	if err := s.db.Where("token_hash = ?", hashToken(refreshToken)).First(&session).Error; err != nil {
		return nil, err
	}
	token, err := s.generateSessionJWT(&user, session.ID)
	if err != nil {
		return nil, err
	}

	s.logSecurityEvent(&user.ID, "login_success", ip, userAgent, "")

	roles := make([]dto.RoleResponse, 0, len(user.Roles))
	permSet := make(map[string]bool)
	roleCodes := make([]string, 0, len(user.Roles))
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
		roles = append(roles, dto.RoleResponse{
			ID:          role.ID,
			Code:        role.Code,
			Name:        role.Name,
			IsSystem:    role.IsSystem,
			Permissions: rolePerms,
		})
		roleCodes = append(roleCodes, role.Code)
	}
	_ = roleCodes

	userResp := dto.UserResponse{
		ID:               user.ID,
		Email:            user.Email,
		FullName:         user.FullName,
		Status:           user.Status,
		MarketingConsent: user.MarketingConsent,
		Roles:            roles,
		Permissions:      permCodes,
		CreatedAt:        user.CreatedAt.Format(time.RFC3339),
	}

	return &dto.LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResp,
	}, nil
}

func (s *AuthService) GenerateRefreshToken(userID uint64, userAgent, ip string) (string, error) {
	rawToken := uuid.New().String()
	tokenHash := hashToken(rawToken)

	rt := model.RefreshToken{
		UserID:    userID,
		TokenHash: tokenHash,
		UserAgent: userAgent,
		IPAddress: ip,
		ExpiresAt: time.Now().Add(s.cfg.RefreshTokenTTL),
	}

	if err := s.db.Create(&rt).Error; err != nil {
		return "", err
	}

	return rawToken, nil
}

func (s *AuthService) RefreshAccessToken(rawRefreshToken string) (string, string, error) {
	var access, refresh string
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var rt model.RefreshToken
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("token_hash = ? AND revoked_at IS NULL AND expires_at > ?", hashToken(rawRefreshToken), time.Now()).First(&rt).Error; err != nil {
			return fmt.Errorf("invalid refresh token")
		}
		var user model.User
		if err := tx.Preload("Roles.Permissions").First(&user, rt.UserID).Error; err != nil {
			return err
		}
		if user.Status != "active" || s.isAccountLocked(&user) {
			return fmt.Errorf("account is not active")
		}
		if err := tx.Model(&rt).Update("revoked_at", time.Now().UTC()).Error; err != nil {
			return err
		}
		refresh = uuid.NewString()
		next := model.RefreshToken{UserID: user.ID, TokenHash: hashToken(refresh), UserAgent: rt.UserAgent, IPAddress: rt.IPAddress, ExpiresAt: time.Now().Add(s.cfg.RefreshTokenTTL)}
		if err := tx.Create(&next).Error; err != nil {
			return err
		}
		var err error
		access, err = s.generateSessionJWT(&user, next.ID)
		return err
	})
	return access, refresh, err
}

func (s *AuthService) RevokeRefreshToken(rawRefreshToken string) error {
	tokenHash := hashToken(rawRefreshToken)
	now := time.Now()
	result := s.db.Model(&model.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", now)
	if result.RowsAffected == 0 {
		return fmt.Errorf("token not found or already revoked")
	}
	return nil
}

func (s *AuthService) RevokeAllUserSessions(userID uint64) error {
	now := time.Now()
	return s.db.Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error
}

func (s *AuthService) VerifyEmail(token string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var verification EmailVerification
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("token = ? AND type = ?", hashToken(token), "register").First(&verification).Error; err != nil {
			return fmt.Errorf("invalid verification token")
		}
		if verification.UsedAt != nil {
			return nil
		}
		if time.Now().After(verification.ExpiresAt) {
			return fmt.Errorf("verification token has expired")
		}
		now := time.Now().UTC()
		result := tx.Model(&model.User{}).Where("id = ? AND status = ?", verification.UserID, "pending_email").Updates(map[string]interface{}{"status": "active", "email_verified_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return fmt.Errorf("account cannot be activated")
		}
		return tx.Model(&verification).Update("used_at", now).Error
	})
}

func (s *AuthService) GetUserByID(userID uint64) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles.Permissions").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *AuthService) ForgotPassword(email string) error {
	var user model.User
	if err := s.db.Where("email = ?", strings.ToLower(strings.TrimSpace(email))).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		token := uuid.NewString()
		verification := EmailVerification{UserID: user.ID, Token: hashToken(token), Type: "password_reset", ExpiresAt: time.Now().Add(time.Hour)}
		if err := tx.Create(&verification).Error; err != nil {
			return err
		}
		return tx.Create(&model.EmailOutbox{To: user.Email, Subject: "Password Reset Request", Body: fmt.Sprintf("Reset your password: %s/reset-password?token=%s", s.cfg.FrontendURL, token), Status: "pending"}).Error
	})
}

func (s *AuthService) ResetPassword(token, password string) error {
	if err := validatePasswordStrength(password); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		var verification EmailVerification
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("token = ? AND type = ? AND used_at IS NULL AND expires_at > ?", hashToken(token), "password_reset", time.Now()).First(&verification).Error; err != nil {
			return fmt.Errorf("invalid or expired reset token")
		}
		if err := tx.Model(&model.User{}).Where("id = ?", verification.UserID).Update("password_hash", string(hash)).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		if err := tx.Model(&verification).Update("used_at", now).Error; err != nil {
			return err
		}
		return tx.Model(&model.RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", verification.UserID).Update("revoked_at", now).Error
	})
}

func (s *AuthService) ChangePassword(userID uint64, oldPassword, newPassword string) error {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return fmt.Errorf("current password is incorrect")
	}

	if err := validatePasswordStrength(newPassword); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Update("password_hash", string(hash)).Error; err != nil {
			return err
		}
		return tx.Model(&model.RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", user.ID).Update("revoked_at", time.Now().UTC()).Error
	})
}

func (s *AuthService) generateSessionJWT(user *model.User, sessionID uint64) (string, error) {
	roleCodes := make([]string, 0, len(user.Roles))
	permSet := make(map[string]bool)
	permCodes := make([]string, 0)

	for _, role := range user.Roles {
		roleCodes = append(roleCodes, role.Code)
		for _, p := range role.Permissions {
			if !permSet[p.Code] {
				permSet[p.Code] = true
				permCodes = append(permCodes, p.Code)
			}
		}
	}

	claims := jwt.MapClaims{
		"user_id":     user.ID,
		"session_id":  sessionID,
		"email":       user.Email,
		"roles":       roleCodes,
		"permissions": permCodes,
		"exp":         time.Now().Add(s.cfg.AccessTokenTTL).Unix(),
		"iat":         time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) SendEmail(to, subject, body string) error {
	outbox := model.EmailOutbox{
		To:      to,
		Subject: subject,
		Body:    body,
		Status:  "pending",
	}
	return s.db.Create(&outbox).Error
}

func (s *AuthService) QueueEmail(to, subject, body string) error {
	outbox := model.EmailOutbox{
		To:      to,
		Subject: subject,
		Body:    body,
		Status:  "pending",
	}
	return s.db.Create(&outbox).Error
}
