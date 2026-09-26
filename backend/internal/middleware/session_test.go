package middleware

import (
	"context"
	"errors"
	"github.com/fursuit-platform/backend/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type fakeSessions struct{ revoked bool }

func (f *fakeSessions) ResolveSession(_ context.Context, u, s uint64) (*Identity, error) {
	if f.revoked || u != 7 || s != 9 {
		return nil, errors.New("revoked")
	}
	return &Identity{UserID: u, Permissions: []string{"orders.read"}}, nil
}
func TestSessionAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.Config{JWTSecret: "test-secret"}
	store := &fakeSessions{}
	claims := func() jwt.MapClaims {
		return jwt.MapClaims{"user_id": 7, "session_id": 9, "iat": time.Now().Unix(), "exp": time.Now().Add(time.Minute).Unix(), "permissions": []string{"roles.assign"}}
	}
	tests := []struct {
		name    string
		edit    func(jwt.MapClaims)
		revoked bool
		want    int
	}{
		{"valid", func(c jwt.MapClaims) {}, false, 200}, {"revoked", func(c jwt.MapClaims) {}, true, 401},
		{"missing session", func(c jwt.MapClaims) { delete(c, "session_id") }, false, 401},
		{"missing expiry", func(c jwt.MapClaims) { delete(c, "exp") }, false, 401},
		{"wrong claim type", func(c jwt.MapClaims) { c["user_id"] = "seven" }, false, 401},
		{"expired", func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Minute).Unix() }, false, 401},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := claims()
			tt.edit(c)
			token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString([]byte(cfg.JWTSecret))
			store.revoked = tt.revoked
			r := gin.New()
			r.Use(SessionAuth(cfg, store))
			r.GET("/", func(c *gin.Context) {
				if HasPermission(c, "roles.assign") {
					t.Error("trusted stale token permissions")
				}
				c.Status(200)
			})
			req := httptest.NewRequest("GET", "/", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tt.want {
				t.Fatalf("got %d want %d", w.Code, tt.want)
			}
		})
	}
}
func TestEveryAdminPermissionAllowAndDeny(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for route, permissions := range AdminPermissions {
		t.Run(route, func(t *testing.T) {
			for _, allowed := range []bool{false, true} {
				r := gin.New()
				r.Use(func(c *gin.Context) {
					perms := []string{}
					if allowed {
						perms = permissions
					}
					c.Set("permissions", perms)
				})
				r.Use(RBACMiddleware(permissions...))
				r.GET("/", func(c *gin.Context) { c.Status(http.StatusOK) })
				w := httptest.NewRecorder()
				r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
				want := 403
				if allowed {
					want = 200
				}
				if w.Code != want {
					t.Fatalf("allow=%v got %d", allowed, w.Code)
				}
			}
		})
	}
}
