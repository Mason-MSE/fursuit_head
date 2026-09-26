package service

import (
	"context"
	"fmt"
	"github.com/fursuit-platform/backend/internal/config"
	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
	"github.com/fursuit-platform/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func integrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("FURSUIT_TEST_DSN")
	if dsn == "" {
		t.Skip("set FURSUIT_TEST_DSN to an isolated migrated MySQL database")
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	return db
}
func TestAuthenticationLifecycleMySQL(t *testing.T) {
	db := integrationDB(t)
	cfg := &config.Config{JWTSecret: "integration-test-secret", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour, MaxLoginAttempts: 5, LockoutDuration: time.Minute, FrontendURL: "http://localhost:3000"}
	auth := NewAuthService(db, cfg, nil)
	email := "test-" + uuid.NewString() + "@example.test"
	password := "Correct!Horse9Battery"
	user, err := auth.Register(dto.RegisterRequest{Email: strings.ToUpper(email), Password: password, PasswordConfirm: password, FullName: "Acceptance Customer"})
	if err != nil {
		t.Fatal(err)
	}
	if user.Email != email {
		t.Fatal("email was not normalized")
	}
	if _, err := auth.Login(dto.LoginRequest{Email: email, Password: password}, "test", "127.0.0.1"); err == nil {
		t.Fatal("unverified login succeeded")
	}
	var outbox model.EmailOutbox
	if err := db.Where("`to` = ?", email).Order("id DESC").First(&outbox).Error; err != nil {
		t.Fatal(err)
	}
	token := strings.Split(outbox.Body, "token=")[1]
	var verification EmailVerification
	db.Where("user_id = ?", user.ID).First(&verification)
	if verification.Token == token || len(verification.Token) != 64 {
		t.Fatal("verification token not hashed")
	}
	if err := auth.ResetPassword(token, password); err == nil {
		t.Fatal("verification token used as password reset")
	}
	if err := auth.VerifyEmail(token); err != nil {
		t.Fatal(err)
	}
	if err := auth.VerifyEmail(token); err != nil {
		t.Fatalf("verification not idempotent: %v", err)
	}
	response, err := auth.Login(dto.LoginRequest{Email: email, Password: password}, "test", "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	if len(response.User.Roles) != 1 || response.User.Roles[0].Code != "customer" {
		t.Fatal("missing customer role")
	}
	repo := &repository.SessionRepository{DB: db}
	sessionID := func(access string) uint64 {
		token, _, err := new(jwt.Parser).ParseUnverified(access, jwt.MapClaims{})
		if err != nil {
			t.Fatal(err)
		}
		return uint64(token.Claims.(jwt.MapClaims)["session_id"].(float64))
	}
	if _, err := repo.ResolveSession(context.Background(), user.ID, sessionID(response.Token)); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); _, _, err := auth.RefreshAccessToken(response.RefreshToken); results <- err }()
	}
	wg.Wait()
	close(results)
	success := 0
	for err := range results {
		if err == nil {
			success++
		}
	}
	if success != 1 {
		t.Fatalf("concurrent refresh succeeded %d times", success)
	}
	if _, err := repo.ResolveSession(context.Background(), user.ID, sessionID(response.Token)); err == nil {
		t.Fatal("rotated access still accepted")
	}
	response, err = auth.Login(dto.LoginRequest{Email: email, Password: password}, "test", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := auth.ForgotPassword(email); err != nil {
		t.Fatal(err)
	}
	db.Where("`to` = ?", email).Order("id DESC").First(&outbox) // use fresh destination below: GORM retains primary keys
	outbox = model.EmailOutbox{}
	db.Where("`to` = ?", email).Order("id DESC").First(&outbox)
	reset := strings.Split(outbox.Body, "token=")[1]
	if err := auth.VerifyEmail(reset); err == nil {
		t.Fatal("reset token used for email verification")
	}
	if err := auth.ResetPassword(reset, "Another!Correct9Pass"); err != nil {
		t.Fatal(err)
	}
	if err := auth.ResetPassword(reset, password); err == nil {
		t.Fatal("reset token replay succeeded")
	}
	if _, err := repo.ResolveSession(context.Background(), user.ID, sessionID(response.Token)); err == nil {
		t.Fatal("password reset did not revoke access")
	}
	if _, _, err := auth.RefreshAccessToken(response.RefreshToken); err == nil {
		t.Fatal("password reset did not revoke refresh")
	}
}
func TestRoleMatrixMySQL(t *testing.T) {
	db := integrationDB(t)
	checks := []struct {
		role, permission string
		allowed          bool
	}{{"support", "payments.confirm", false}, {"support", "roles.update", false}, {"support", "commissions.read", true}, {"maker", "commissions.read", false}, {"maker", "commissions.read_assigned", true}, {"maker", "payments.confirm", false}, {"finance", "payments.confirm", true}, {"content_editor", "orders.read", false}, {"warehouse", "orders.ship", true}}
	for _, check := range checks {
		t.Run(fmt.Sprintf("%s/%s", check.role, check.permission), func(t *testing.T) {
			var n int64
			err := db.Table("role_permissions rp").Joins("JOIN roles r ON r.id=rp.role_id").Joins("JOIN permissions p ON p.id=rp.permission_id").Where("r.code = ? AND p.code = ?", check.role, check.permission).Count(&n).Error
			if err != nil {
				t.Fatal(err)
			}
			if (n > 0) != check.allowed {
				t.Fatalf("permission allowed=%v want %v", n > 0, check.allowed)
			}
		})
	}
}
