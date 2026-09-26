package middleware

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/fursuit-platform/backend/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Identity is resolved from the authoritative session store, never JWT permissions.
type Identity struct {
	UserID             uint64
	Email              string
	Roles, Permissions []string
}
type SessionResolver interface {
	ResolveSession(context.Context, uint64, uint64) (*Identity, error)
}

type accessClaims struct {
	UserID    uint64 `json:"user_id"`
	SessionID uint64 `json:"session_id"`
	jwt.RegisteredClaims
}

func SessionAuth(cfg *config.Config, resolver SessionResolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		deny := func() {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "error": gin.H{"code": "UNAUTHORIZED", "message": "Session is invalid or expired", "request_id": c.GetString("request_id")}})
		}
		parts := strings.Fields(c.GetHeader("Authorization"))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			deny()
			return
		}
		claims := &accessClaims{}
		token, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (interface{}, error) { return []byte(cfg.JWTSecret), nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired(), jwt.WithIssuedAt())
		if err != nil || !token.Valid || claims.UserID == 0 || claims.SessionID == 0 || claims.IssuedAt == nil || claims.IssuedAt.Time.After(time.Now()) {
			deny()
			return
		}
		identity, err := resolver.ResolveSession(c.Request.Context(), claims.UserID, claims.SessionID)
		if err != nil || identity == nil {
			deny()
			return
		}
		c.Set("user_id", identity.UserID)
		c.Set("email", identity.Email)
		c.Set("roles", identity.Roles)
		c.Set("permissions", identity.Permissions)
		c.Set("session_id", claims.SessionID)
		c.Next()
	}
}

// AdminPermissions is an explicit route registry. A new route is denied until classified.
var AdminPermissions = map[string][]string{
	"GET /dashboard/stats": {"reports.read"}, "GET /dashboard/activity": {"audit.read"},
	"GET /users": {"users.read"}, "GET /users/:id": {"users.read"}, "PUT /users/:id": {"users.update"},
	"GET /users/:id/orders": {"orders.read"}, "GET /users/:id/audit": {"audit.read"},
	"GET /roles": {"roles.read"}, "GET /roles/:id": {"roles.read"}, "POST /roles": {"roles.create"}, "PUT /roles/:id": {"roles.update"}, "DELETE /roles/:id": {"roles.delete"}, "GET /permissions": {"roles.read"},
	"GET /products": {"products.read"}, "POST /products": {"products.create"}, "PUT /products/:id": {"products.update"}, "DELETE /products/:id": {"products.delete"},
	"GET /orders": {"orders.read"}, "GET /orders/:id": {"orders.read"}, "PUT /orders/:id/status": {"orders.update"},
	"GET /commissions": {"commissions.read", "commissions.read_assigned"}, "GET /commissions/:id": {"commissions.read", "commissions.read_assigned"}, "PUT /commissions/:id": {"commissions.update", "milestones.update_assigned"}, "PUT /commissions/:id/assign": {"commissions.assign"},
	"GET /payments": {"payments.read"}, "PUT /payments/:id/confirm": {"payments.confirm"},
	"GET /tickets": {"tickets.read"}, "GET /tickets/:id": {"tickets.read"}, "PUT /tickets/:id/status": {"tickets.update"}, "POST /tickets/:id/messages": {"tickets.update"},
	"GET /audit": {"audit.read"}, "GET /pages": {"pages.read"}, "POST /pages": {"pages.create"}, "PUT /pages/:id": {"pages.update"}, "GET /pages/:id/versions": {"pages.read"}, "POST /pages/:id/approve": {"pages.publish"}, "POST /pages/:id/rollback": {"pages.publish"},
	"GET /commission-config": {"settings.read"}, "PUT /commission-config": {"settings.update_business"},
}

func HasPermission(c *gin.Context, permission string) bool {
	for _, p := range c.GetStringSlice("permissions") {
		if p == permission {
			return true
		}
	}
	return false
}
func AdminAuthorization() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !HasPermission(c, "auth.admin_login") {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}
		key := c.Request.Method + " " + strings.TrimPrefix(c.FullPath(), "/api/v1/admin")
		RBACMiddleware(AdminPermissions[key]...)(c)
	}
}

type CommissionScopeResolver interface {
	IsAssigned(context.Context, uint64, uint64) (bool, error)
}

func AssignedCommissionScope(resolver CommissionScopeResolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := strings.TrimPrefix(c.FullPath(), "/api/v1/admin")
		if !strings.HasPrefix(path, "/commissions") {
			c.Next()
			return
		}
		broad := "commissions.read"
		if c.Request.Method != "GET" {
			broad = "commissions.update"
		}
		if HasPermission(c, broad) || HasPermission(c, "commissions.assign") {
			c.Next()
			return
		}
		c.Set("assigned_only", true)
		if c.Param("id") != "" {
			id, err := strconv.ParseUint(c.Param("id"), 10, 64)
			if err == nil {
				var ok bool
				ok, err = resolver.IsAssigned(c.Request.Context(), id, c.GetUint64("user_id"))
				if !ok {
					err = errors.New("not found")
				}
			}
			if err != nil {
				c.AbortWithStatus(http.StatusNotFound)
				return
			}
		}
		c.Next()
	}
}
