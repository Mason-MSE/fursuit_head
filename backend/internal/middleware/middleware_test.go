package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRBACMiddleware_RequiresPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userPerms      []string
		requiredPerms  []string
		expectedStatus int
	}{
		{"has permission", []string{"orders.read", "orders.write"}, []string{"orders.read"}, http.StatusOK},
		{"missing permission", []string{"orders.read"}, []string{"orders.write"}, http.StatusForbidden},
		{"no permissions", []string{}, []string{"orders.read"}, http.StatusForbidden},
		{"any of multiple required", []string{"orders.read"}, []string{"orders.read", "orders.write"}, http.StatusOK},
		{"multiple user perms match", []string{"orders.read", "orders.write", "orders.delete"}, []string{"orders.write"}, http.StatusOK},
		{"admin full access", []string{"orders.read", "orders.write", "orders.delete", "users.manage"}, []string{"orders.read"}, http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("permissions", tt.userPerms)
				c.Next()
			})
			router.Use(RBACMiddleware(tt.requiredPerms...))
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"ok": true})
			})

			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestRBACMiddleware_NoPermissionsContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RBACMiddleware("orders.read"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status %d when no permissions in context, got %d", http.StatusForbidden, w.Code)
	}
}

func TestRBACMiddleware_InvalidPermissionsType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", "not-a-slice")
		c.Next()
	})
	router.Use(RBACMiddleware("orders.read"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status %d for invalid permissions type, got %d", http.StatusForbidden, w.Code)
	}
}

func TestRBACMiddleware_NoRequiredPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", []string{"orders.read"})
		c.Next()
	})
	router.Use(RBACMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status %d when no permissions required (deny by default), got %d", http.StatusForbidden, w.Code)
	}
}

func TestRBACMiddleware_ExactMatchOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		userPerms      []string
		requiredPerms  []string
		expectedStatus int
	}{
		{"exact match", []string{"products.read"}, []string{"products.read"}, http.StatusOK},
		{"partial prefix not enough", []string{"products"}, []string{"products.read"}, http.StatusForbidden},
		{"superset string not matched", []string{"products.read.write.delete"}, []string{"products.read"}, http.StatusForbidden},
		{"exact subset matched", []string{"products.read"}, []string{"products.read"}, http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("permissions", tt.userPerms)
				c.Next()
			})
			router.Use(RBACMiddleware(tt.requiredPerms...))
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"ok": true})
			})

			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}

func TestRBACMiddleware_MultipleScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userPerms := []string{"orders.read", "products.read", "users.read"}

	tests := []struct {
		name           string
		requiredPerms  []string
		expectedStatus int
	}{
		{"orders.read", []string{"orders.read"}, http.StatusOK},
		{"orders.write", []string{"orders.write"}, http.StatusForbidden},
		{"products.read", []string{"products.read"}, http.StatusOK},
		{"users.write", []string{"users.write"}, http.StatusForbidden},
		{"any of orders.read or orders.write", []string{"orders.read", "orders.write"}, http.StatusOK},
		{"any of orders.delete or users.delete", []string{"orders.delete", "users.delete"}, http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("permissions", userPerms)
				c.Next()
			})
			router.Use(RBACMiddleware(tt.requiredPerms...))
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"ok": true})
			})

			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}
