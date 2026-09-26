package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/config"
	"github.com/fursuit-platform/backend/internal/handler"
	"github.com/fursuit-platform/backend/internal/middleware"
	"github.com/fursuit-platform/backend/internal/platform/db"
	"github.com/fursuit-platform/backend/internal/platform/redis"
	"github.com/fursuit-platform/backend/internal/repository"
	"github.com/fursuit-platform/backend/internal/service"
)

func main() {
	cfg := config.Load()

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	gormDB, err := db.New(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	rdb, err := redis.New(cfg.RedisAddr)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	services := initServices(gormDB, cfg, rdb)
	handlers := initHandlers(services)
	jobContext, stopJobs := context.WithCancel(context.Background())
	defer stopJobs()
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-jobContext.Done():
				return
			case <-ticker.C:
				if err := services.EmailService.ProcessOutbox(); err != nil {
					log.Printf("outbox failed: %v", err)
				}
			}
		}
	}()

	router := setupRouter(cfg, gormDB, rdb, services, handlers)

	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: router,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}

type Services struct {
	AuthService       *service.AuthService
	ProductService    *service.ProductService
	OrderService      *service.OrderService
	CommissionService *service.CommissionService
	QuoteService      *service.QuoteService
	PaymentService    *service.PaymentService
	SupportService    *service.SupportService
	AdminService      *service.AdminService
	CartService       *service.CartService
	AddressService    *service.AddressService
	PageService       *service.PageService
	AuditService      *service.AuditService
	EmailService      *service.EmailService
	UploadService     *service.UploadService
	HealthService     *service.HealthService
	InventoryService  *service.InventoryService
}

func initServices(dbConn *gorm.DB, cfg *config.Config, rdb *goredis.Client) *Services {
	inventoryService := service.NewInventoryService(dbConn)
	return &Services{
		AuthService:       service.NewAuthService(dbConn, cfg, rdb),
		ProductService:    service.NewProductService(dbConn),
		OrderService:      service.NewOrderService(dbConn, inventoryService),
		CommissionService: service.NewCommissionService(dbConn),
		QuoteService:      service.NewQuoteService(dbConn),
		PaymentService:    service.NewPaymentService(dbConn),
		SupportService:    service.NewSupportService(dbConn),
		AdminService:      service.NewAdminService(dbConn),
		CartService:       service.NewCartService(dbConn),
		AddressService:    service.NewAddressService(dbConn),
		PageService:       service.NewPageService(dbConn),
		AuditService:      service.NewAuditService(dbConn),
		EmailService:      service.NewEmailService(dbConn, cfg),
		UploadService:     service.NewUploadService(cfg),
		HealthService:     service.NewHealthService(dbConn, rdb),
		InventoryService:  inventoryService,
	}
}

func loadConfig() *config.Config {
	return config.Load()
}

type Handlers struct {
	Auth       *handler.AuthHandler
	Product    *handler.ProductHandler
	Order      *handler.OrderHandler
	Commission *handler.CommissionHandler
	Payment    *handler.PaymentHandler
	Support    *handler.SupportHandler
	Admin      *handler.AdminHandler
	Cart       *handler.CartHandler
	Address    *handler.AddressHandler
	Page       *handler.PageHandler
	Upload     *handler.UploadHandler
}

func initHandlers(s *Services) *Handlers {
	return &Handlers{
		Auth:       handler.NewAuthHandler(s.AuthService),
		Product:    handler.NewProductHandler(s.ProductService),
		Order:      handler.NewOrderHandler(s.OrderService),
		Commission: handler.NewCommissionHandler(s.CommissionService, s.QuoteService),
		Payment:    handler.NewPaymentHandler(s.PaymentService),
		Support:    handler.NewSupportHandler(s.SupportService),
		Admin:      handler.NewAdminHandler(s.AdminService),
		Cart:       handler.NewCartHandler(s.CartService),
		Address:    handler.NewAddressHandler(s.AddressService),
		Page:       handler.NewPageHandler(s.PageService),
		Upload:     handler.NewUploadHandler(s.UploadService),
	}
}

func setupRouter(cfg *config.Config, dbConn *gorm.DB, rdb *goredis.Client, s *Services, h *Handlers) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()

	r.Use(middleware.SecurityHeadersMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.FrontendURL))
	r.Use(middleware.RequestIDMiddleware())
	r.Use(gin.Recovery())

	r.Static("/uploads", cfg.FileUploadPath)

	r.GET("/health", func(c *gin.Context) {
		status := s.HealthService.Readiness()
		httpStatus := http.StatusOK
		if status.Status != "ok" {
			httpStatus = http.StatusServiceUnavailable
		}
		c.JSON(httpStatus, status)
	})

	r.GET("/health/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, s.HealthService.Liveness())
	})

	r.GET("/health/ready", func(c *gin.Context) {
		status := s.HealthService.Readiness()
		httpStatus := http.StatusOK
		if status.Status != "ok" {
			httpStatus = http.StatusServiceUnavailable
		}
		c.JSON(httpStatus, status)
	})

	api := r.Group("/api/v1")
	files := &handler.PrivateFileHandler{Service: service.NewPrivateFileService(dbConn, cfg), MaxBytes: int64(cfg.MaxFileSizeMB) * 1024 * 1024}
	api.GET("/files/:id/download", files.Download)

	public := api.Group("")
	{
		public.POST("/auth/register", middleware.RateLimitMiddleware(rdb, cfg.RateLimitWindow, cfg.RateLimitMax), h.Auth.Register)
		public.POST("/admin/auth/login", middleware.RateLimitMiddleware(rdb, cfg.RateLimitWindow, cfg.RateLimitMax), h.Auth.AdminLogin)
		public.POST("/auth/login", middleware.RateLimitMiddleware(rdb, cfg.RateLimitWindow, cfg.RateLimitMax), h.Auth.Login)
		public.POST("/auth/verify-email", h.Auth.VerifyEmail)
		public.GET("/auth/verify-email", h.Auth.VerifyEmail)
		public.POST("/auth/forgot-password", middleware.RateLimitMiddleware(rdb, cfg.RateLimitWindow, cfg.RateLimitMax), h.Auth.ForgotPassword)
		public.POST("/auth/reset-password", h.Auth.ResetPassword)
		public.POST("/auth/refresh-token", h.Auth.RefreshToken)

		public.GET("/products", h.Product.ListProducts)
		public.GET("/products/:id", h.Product.GetProduct)
		public.GET("/categories", h.Product.ListCategories)

		public.GET("/pages/:slug", h.Page.GetPage)
		public.GET("/commission-config", h.Page.GetCommissionConfig)
	}

	protected := api.Group("")
	protected.Use(middleware.SessionAuth(cfg, &repository.SessionRepository{DB: dbConn}))
	{
		protected.GET("/auth/me", h.Auth.GetMe)
		protected.POST("/auth/logout", h.Auth.Logout)
		protected.POST("/auth/change-password", h.Auth.ChangePassword)

		protected.GET("/me/cart", h.Cart.GetCart)
		protected.POST("/me/cart/items", h.Cart.AddItem)
		protected.PUT("/me/cart/items/:id", h.Cart.UpdateItem)
		protected.DELETE("/me/cart/items/:id", h.Cart.RemoveItem)

		protected.GET("/me/addresses", h.Address.ListAddresses)
		protected.GET("/me/addresses/:id", h.Address.GetAddress)
		protected.POST("/me/addresses", h.Address.CreateAddress)
		protected.PUT("/me/addresses/:id", h.Address.UpdateAddress)
		protected.DELETE("/me/addresses/:id", h.Address.DeleteAddress)

		protected.POST("/me/orders", h.Order.CreateOrder)
		protected.GET("/me/orders", h.Order.ListMyOrders)
		protected.GET("/me/orders/:id", h.Order.GetMyOrder)
		protected.POST("/me/orders/:id/cancel", h.Order.CancelMyOrder)

		protected.POST("/me/commissions", h.Commission.CreateCommission)
		protected.GET("/me/commissions", h.Commission.ListMyCommissions)
		protected.GET("/me/commissions/:id", h.Commission.GetMyCommission)
		protected.PUT("/me/commissions/:id", h.Commission.UpdateCommission)
		protected.POST("/me/commissions/:id/submit", h.Commission.SubmitCommission)
		protected.GET("/me/commissions/:id/quotes", h.Commission.GetQuotes)
		protected.POST("/me/commissions/:id/quotes/:quoteId/accept", h.Commission.AcceptQuote)

		protected.POST("/me/payments/upload", h.Payment.UploadReceipt)
		protected.GET("/me/payments", h.Payment.ListMyPayments)

		protected.POST("/me/tickets", h.Support.CreateTicket)
		protected.GET("/me/tickets", h.Support.ListMyTickets)
		protected.POST("/me/tickets/:id/messages", h.Support.AddTicketMessage)

		protected.POST("/upload", files.Upload)
		protected.GET("/me/files/:id/link", files.Link)
	}

	admin := api.Group("/admin")
	admin.Use(middleware.SessionAuth(cfg, &repository.SessionRepository{DB: dbConn}))
	admin.Use(middleware.AdminAuthorization())
	admin.Use(middleware.AssignedCommissionScope(&repository.SessionRepository{DB: dbConn}))
	{
		admin.GET("/dashboard/stats", h.Admin.GetDashboardStats)
		admin.GET("/dashboard/activity", h.Admin.GetRecentActivity)

		admin.GET("/users", h.Admin.ListUsers)
		admin.GET("/users/:id", h.Admin.GetUser)
		admin.PUT("/users/:id", h.Admin.UpdateUser)
		admin.GET("/users/:id/orders", h.Admin.GetUserOrders)
		admin.GET("/users/:id/audit", h.Admin.GetUserAuditTrail)

		admin.GET("/roles", h.Admin.ListRoles)
		admin.GET("/roles/:id", h.Admin.GetRole)
		admin.POST("/roles", h.Admin.CreateRole)
		admin.PUT("/roles/:id", h.Admin.UpdateRole)
		admin.DELETE("/roles/:id", h.Admin.DeleteRole)

		admin.GET("/permissions", h.Admin.GetPermissions)

		admin.GET("/products", h.Product.ListProducts)
		admin.POST("/products", h.Product.CreateProduct)
		admin.PUT("/products/:id", h.Product.UpdateProduct)
		admin.DELETE("/products/:id", h.Product.DeleteProduct)

		admin.GET("/orders", h.Order.ListAdminOrders)
		admin.GET("/orders/:id", h.Admin.GetOrder)
		admin.PUT("/orders/:id/status", h.Order.UpdateOrderStatus)

		admin.GET("/commissions", h.Commission.ListAdminCommissions)
		admin.GET("/commissions/:id", h.Admin.GetCommission)
		admin.PUT("/commissions/:id", h.Commission.UpdateCommission)
		admin.PUT("/commissions/:id/assign", h.Commission.AssignMaker)

		admin.GET("/payments", h.Payment.ListAdminPayments)
		admin.PUT("/payments/:id/confirm", h.Payment.ConfirmPayment)

		admin.GET("/tickets", h.Support.ListAdminTickets)
		admin.GET("/tickets/:id", h.Admin.GetTicket)
		admin.PUT("/tickets/:id/status", h.Support.UpdateTicketStatus)
		admin.POST("/tickets/:id/messages", h.Admin.AddTicketMessage)

		admin.GET("/audit", h.Admin.ListAuditLogs)

		admin.GET("/pages", h.Page.ListPages)
		admin.POST("/pages", h.Page.CreatePage)
		admin.PUT("/pages/:id", h.Page.UpdatePage)
		admin.GET("/pages/:id/versions", h.Page.GetPageVersions)
		admin.POST("/pages/:id/approve", h.Page.ApprovePage)
		admin.POST("/pages/:id/rollback", h.Page.RollbackPage)

		admin.GET("/commission-config", h.Page.GetCommissionConfig)
		admin.PUT("/commission-config", h.Page.UpdateCommissionConfig)
	}

	return r
}
