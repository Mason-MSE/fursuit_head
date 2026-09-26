package repository

import (
	"context"
	"fmt"
	"github.com/fursuit-platform/backend/internal/middleware"
	"github.com/fursuit-platform/backend/internal/model"
	"gorm.io/gorm"
	"time"
)

type SessionRepository struct{ DB *gorm.DB }

func (r *SessionRepository) ResolveSession(ctx context.Context, userID, sessionID uint64) (*middleware.Identity, error) {
	var session model.RefreshToken
	if err := r.DB.WithContext(ctx).Where("id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?", sessionID, userID, time.Now().UTC()).First(&session).Error; err != nil {
		return nil, err
	}
	var user model.User
	if err := r.DB.WithContext(ctx).Preload("Roles.Permissions").First(&user, userID).Error; err != nil {
		return nil, err
	}
	if user.Status != "active" || (user.LockedUntil != nil && user.LockedUntil.After(time.Now())) {
		return nil, fmt.Errorf("inactive account")
	}
	result := &middleware.Identity{UserID: user.ID, Email: user.Email, Roles: []string{}, Permissions: []string{}}
	for _, role := range user.Roles {
		result.Roles = append(result.Roles, role.Code)
		for _, permission := range role.Permissions {
			result.Permissions = append(result.Permissions, permission.Code)
		}
	}
	return result, nil
}
func (r *SessionRepository) IsAssigned(ctx context.Context, id, userID uint64) (bool, error) {
	var count int64
	err := r.DB.WithContext(ctx).Model(&model.Commission{}).Where("id = ? AND maker_id = ?", id, userID).Count(&count).Error
	return count == 1, err
}
