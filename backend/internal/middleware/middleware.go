package middleware

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	goredis "github.com/redis/go-redis/v9"

	"github.com/fursuit-platform/backend/internal/config"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "UNAUTHORIZED", "message": "Authorization header required"},
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_TOKEN", "message": "Invalid authorization format"},
			})
			c.Abort()
			return
		}

		token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_TOKEN", "message": "Invalid token claims"},
			})
			c.Abort()
			return
		}

		userID := uint64(claims["user_id"].(float64))
		email := claims["email"].(string)

		c.Set("user_id", userID)
		c.Set("email", email)

		if roles, ok := claims["roles"].([]interface{}); ok {
			roleStrings := make([]string, len(roles))
			for i, r := range roles {
				roleStrings[i] = r.(string)
			}
			c.Set("roles", roleStrings)
		}

		if perms, ok := claims["permissions"].([]interface{}); ok {
			permStrings := make([]string, len(perms))
			for i, p := range perms {
				permStrings[i] = p.(string)
			}
			c.Set("permissions", permStrings)
		}

		c.Next()
	}
}

func RBACMiddleware(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		perms, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "No permissions found"},
			})
			c.Abort()
			return
		}

		userPerms, ok := perms.([]string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "Invalid permissions format"},
			})
			c.Abort()
			return
		}

		permSet := make(map[string]bool)
		for _, p := range userPerms {
			permSet[p] = true
		}

		for _, required := range requiredPermissions {
			if permSet[required] {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   gin.H{"code": "FORBIDDEN", "message": "Insufficient permissions"},
		})
		c.Abort()
	}
}

func RoleMiddleware(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roles, exists := c.Get("roles")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "No roles found"},
			})
			c.Abort()
			return
		}

		userRoles, ok := roles.([]string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   gin.H{"code": "FORBIDDEN", "message": "Invalid roles format"},
			})
			c.Abort()
			return
		}

		roleSet := make(map[string]bool)
		for _, r := range userRoles {
			roleSet[r] = true
		}

		for _, required := range requiredRoles {
			if roleSet[required] {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   gin.H{"code": "FORBIDDEN", "message": "Insufficient role privileges"},
		})
		c.Abort()
	}
}

func CORSMiddleware(frontendURL string) gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		frontendURL: true,
		"http://localhost:3000": true,
		"http://localhost:3001": true,
		"http://localhost:5173": true,
		"http://localhost:5174": true,
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func generateRequestID() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		fallback := make([]byte, 16)
		for i := range fallback {
			fallback[i] = "0123456789abcdef"[byte(i*7+3)%16]
		}
		return string(fallback)
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func RateLimitMiddleware(rdb *goredis.Client, window time.Duration, maxRequests int) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := fmt.Sprintf("ratelimit:%s", c.ClientIP())

		ctx := context.Background()
		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}

		if count == 1 {
			rdb.Expire(ctx, key, window)
		}

		remaining := maxRequests - int(count)
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if int(count) > maxRequests {
			ttl, _ := rdb.TTL(ctx, key).Result()
			c.Header("Retry-After", fmt.Sprintf("%.0f", ttl.Seconds()))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error":   gin.H{"code": "RATE_LIMITED", "message": "Too many requests, please try again later"},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		c.Header("Content-Security-Policy", "default-src 'self'")
		c.Next()
	}
}
