package model

import (
	"database/sql"
	"time"
)

// RBAC
type Permission struct {
	ID          uint64    `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex;size:100"`
	Name        string    `json:"name" gorm:"size:200"`
	Description string    `json:"description"`
	Module      string    `json:"module" gorm:"size:50"`
	CreatedAt   time.Time `json:"created_at"`
}

type Role struct {
	ID          uint64       `json:"id" gorm:"primaryKey"`
	Code        string       `json:"code" gorm:"uniqueIndex;size:50"`
	Name        string       `json:"name" gorm:"size:100"`
	Description string       `json:"description"`
	IsSystem    bool         `json:"is_system" gorm:"default:false"`
	CreatedBy   *uint64      `json:"created_by"`
	Permissions []Permission `json:"permissions" gorm:"many2many:role_permissions;"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type RolePermission struct {
	RoleID       uint64 `json:"role_id" gorm:"primaryKey"`
	PermissionID uint64 `json:"permission_id" gorm:"primaryKey"`
	Scope        string `json:"scope" gorm:"size:20;default:all"`
}

// User
type User struct {
	ID                  uint64         `json:"id" gorm:"primaryKey"`
	Email               string         `json:"email" gorm:"uniqueIndex;size:255"`
	PasswordHash        string         `json:"-" gorm:"size:255"`
	FullName            string         `json:"full_name" gorm:"size:200"`
	Phone               sql.NullString `json:"phone" gorm:"size:50"`
	AvatarURL           sql.NullString `json:"avatar_url" gorm:"size:500"`
	Status              string         `json:"status" gorm:"size:20;default:pending_email"`
	EmailVerifiedAt     *time.Time     `json:"email_verified_at"`
	LastLoginAt         *time.Time     `json:"last_login_at"`
	MarketingConsent    bool           `json:"marketing_consent" gorm:"default:false"`
	FailedLoginAttempts int            `json:"failed_login_attempts" gorm:"default:0"`
	LockedUntil         *time.Time     `json:"locked_until"`
	LoginProvider       string         `json:"login_provider" gorm:"size:20;default:local"`
	Roles               []Role         `json:"roles" gorm:"many2many:user_roles;"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
}

type Address struct {
	ID         uint64    `json:"id" gorm:"primaryKey"`
	UserID     uint64    `json:"user_id" gorm:"index"`
	Label      string    `json:"label" gorm:"size:100"`
	FullName   string    `json:"full_name" gorm:"size:200"`
	Phone      string    `json:"phone" gorm:"size:50"`
	Line1      string    `json:"line1" gorm:"size:255"`
	Line2      string    `json:"line2" gorm:"size:255"`
	City       string    `json:"city" gorm:"size:100"`
	State      string    `json:"state" gorm:"size:100"`
	PostalCode string    `json:"postal_code" gorm:"size:20"`
	Country    string    `json:"country" gorm:"size:2;default:NZ"`
	IsDefault  bool      `json:"is_default" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Product & Catalog
type Category struct {
	ID          uint64     `json:"id" gorm:"primaryKey"`
	ParentID    *uint64    `json:"parent_id"`
	Name        string     `json:"name" gorm:"size:200"`
	Slug        string     `json:"slug" gorm:"uniqueIndex;size:200"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url" gorm:"size:500"`
	SortOrder   int        `json:"sort_order" gorm:"default:0"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	Children    []Category `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Product struct {
	ID               uint64           `json:"id" gorm:"primaryKey"`
	CategoryID       *uint64          `json:"category_id" gorm:"index"`
	SKU              string           `json:"sku" gorm:"uniqueIndex;size:100"`
	Name             string           `json:"name" gorm:"size:500"`
	Slug             string           `json:"slug" gorm:"uniqueIndex;size:500"`
	Description      string           `json:"description"`
	ShortDescription string           `json:"short_description" gorm:"size:1000"`
	BasePriceCents   uint64           `json:"base_price_cents"`
	Currency         string           `json:"currency" gorm:"size:3;default:NZD"`
	GSTRate          float64          `json:"gst_rate" gorm:"default:15.00"`
	ProductType      string           `json:"product_type" gorm:"size:20;default:ready_to_ship"`
	Status           string           `json:"status" gorm:"size:20;default:draft"`
	MainImageURL     string           `json:"main_image_url" gorm:"size:500"`
	ImageURL         string           `json:"image_url" gorm:"-"`
	CareInstructions string           `json:"care_instructions"`
	SafetyNotes      string           `json:"safety_notes"`
	ShippingInfo     string           `json:"shipping_info"`
	ReturnPolicy     string           `json:"return_policy"`
	MetaTitle        string           `json:"meta_title" gorm:"size:200"`
	MetaDescription  string           `json:"meta_description" gorm:"size:500"`
	WeightGrams      *int             `json:"weight_grams"`
	EstimatedDaysMin *int             `json:"estimated_days_min"`
	EstimatedDaysMax *int             `json:"estimated_days_max"`
	Images           []ProductImage   `json:"images,omitempty" gorm:"foreignKey:ProductID"`
	Variants         []ProductVariant `json:"variants,omitempty" gorm:"foreignKey:ProductID"`
	Category         *Category        `json:"category,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
	DeletedAt        *time.Time       `json:"deleted_at"`
}

type ProductImage struct {
	ID        uint64 `json:"id" gorm:"primaryKey"`
	ProductID uint64 `json:"product_id" gorm:"index"`
	URL       string `json:"url" gorm:"size:500"`
	AltText   string `json:"alt_text" gorm:"size:500"`
	SortOrder int    `json:"sort_order" gorm:"default:0"`
}

type ProductVariant struct {
	ID            uint64 `json:"id" gorm:"primaryKey"`
	ProductID     uint64 `json:"product_id" gorm:"index"`
	Name          string `json:"name" gorm:"size:200"`
	SKU           string `json:"sku" gorm:"uniqueIndex;size:100"`
	PriceCents    uint64 `json:"price_cents"`
	StockOnHand   int    `json:"stock_on_hand" gorm:"default:0"`
	StockReserved int    `json:"stock_reserved" gorm:"default:0"`
	Attributes    string `json:"attributes" gorm:"type:json"`
	IsActive      bool   `json:"is_active" gorm:"default:true"`
}

func (v ProductVariant) AvailableStock() int {
	return v.StockOnHand - v.StockReserved
}

type StockMovement struct {
	ID            uint64    `json:"id" gorm:"primaryKey"`
	VariantID     uint64    `json:"variant_id" gorm:"index"`
	Type          string    `json:"type" gorm:"size:20"`
	Quantity      int       `json:"quantity"`
	ReferenceType string    `json:"reference_type" gorm:"size:50"`
	ReferenceID   *uint64   `json:"reference_id"`
	Note          string    `json:"note"`
	CreatedBy     *uint64   `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}

// Cart
type Cart struct {
	ID        uint64     `json:"id" gorm:"primaryKey"`
	UserID    uint64     `json:"user_id" gorm:"uniqueIndex"`
	Items     []CartItem `json:"items,omitempty" gorm:"foreignKey:CartID"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CartItem struct {
	ID                 uint64          `json:"id" gorm:"primaryKey"`
	CartID             uint64          `json:"cart_id" gorm:"index"`
	VariantID          uint64          `json:"variant_id"`
	Quantity           int             `json:"quantity" gorm:"default:1"`
	PriceCentsSnapshot uint64          `json:"price_cents_snapshot"`
	Variant            *ProductVariant `json:"variant,omitempty"`
}

// Order
type Order struct {
	AllowedActions          []string             `json:"allowed_actions" gorm:"-"`
	History                 []OrderStatusHistory `json:"history,omitempty" gorm:"foreignKey:OrderID"`
	ShippingAddressSnapshot string               `json:"shipping_address_snapshot" gorm:"type:json"`
	ID                      uint64               `json:"id" gorm:"primaryKey"`
	OrderNumber             string               `json:"order_number" gorm:"uniqueIndex;size:50"`
	UserID                  uint64               `json:"user_id" gorm:"index"`
	Status                  string               `json:"status" gorm:"size:50;default:pending"`
	SubtotalCents           uint64               `json:"subtotal_cents"`
	ShippingCents           uint64               `json:"shipping_cents"`
	TaxCents                uint64               `json:"tax_cents"`
	TotalCents              uint64               `json:"total_cents"`
	Currency                string               `json:"currency" gorm:"size:3;default:NZD"`
	ShippingAddressID       *uint64              `json:"shipping_address_id"`
	ShippingMethod          string               `json:"shipping_method" gorm:"size:100"`
	TrackingNumber          string               `json:"tracking_number" gorm:"size:200"`
	ShippedAt               *time.Time           `json:"shipped_at"`
	DeliveredAt             *time.Time           `json:"delivered_at"`
	Notes                   string               `json:"notes"`
	InternalNotes           string               `json:"internal_notes"`
	Version                 int                  `json:"version" gorm:"default:1"`
	Items                   []OrderItem          `json:"items,omitempty" gorm:"foreignKey:OrderID"`
	User                    *User                `json:"user,omitempty"`
	ShippingAddress         *Address             `json:"shipping_address,omitempty"`
	Payments                []Payment            `json:"payments,omitempty" gorm:"foreignKey:OrderID"`
	CreatedAt               time.Time            `json:"created_at"`
	UpdatedAt               time.Time            `json:"updated_at"`
}

type OrderItem struct {
	ID             uint64  `json:"id" gorm:"primaryKey"`
	OrderID        uint64  `json:"order_id" gorm:"index"`
	VariantID      uint64  `json:"variant_id"`
	ProductName    string  `json:"product_name" gorm:"size:500"`
	VariantName    string  `json:"variant_name" gorm:"size:200"`
	SKU            string  `json:"sku" gorm:"size:100"`
	Quantity       int     `json:"quantity"`
	UnitPriceCents uint64  `json:"unit_price_cents"`
	TaxRate        float64 `json:"tax_rate"`
	TotalCents     uint64  `json:"total_cents"`
}

type OrderStatusHistory struct {
	ID         uint64    `json:"id" gorm:"primaryKey"`
	OrderID    uint64    `json:"order_id" gorm:"index"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	ActorID    *uint64   `json:"actor_id"`
	Reason     string    `json:"reason"`
	Metadata   string    `json:"metadata" gorm:"type:json"`
	CreatedAt  time.Time `json:"created_at"`
}

// Payment
type Payment struct {
	ID              uint64     `json:"id" gorm:"primaryKey"`
	PaymentNumber   string     `json:"payment_number" gorm:"uniqueIndex;size:50"`
	OrderID         uint64     `json:"order_id" gorm:"index"`
	Type            string     `json:"type" gorm:"size:20;default:full"`
	Method          string     `json:"method" gorm:"size:20;default:bank_transfer"`
	Status          string     `json:"status" gorm:"size:20;default:pending"`
	AmountCents     uint64     `json:"amount_cents"`
	Currency        string     `json:"currency" gorm:"size:3;default:NZD"`
	ReceiptURL      string     `json:"receipt_url" gorm:"size:500"`
	ReceiptFilename string     `json:"receipt_filename" gorm:"size:255"`
	BankReference   string     `json:"bank_reference" gorm:"size:200"`
	Notes           string     `json:"notes"`
	ConfirmedBy     *uint64    `json:"confirmed_by"`
	ConfirmedAt     *time.Time `json:"confirmed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Commission
type Commission struct {
	CulturalDecision     string   `json:"cultural_decision"`
	DepositReceivedCents uint64   `json:"deposit_received_cents"`
	FinalReceivedCents   uint64   `json:"final_received_cents"`
	TrackingNumber       string   `json:"tracking_number"`
	RevisionCount        int      `json:"revision_count"`
	AllowedActions       []string `json:"allowed_actions" gorm:"-"`

	ID                   uint64    `json:"id" gorm:"primaryKey"`
	CommissionNumber     string    `json:"commission_number" gorm:"uniqueIndex;size:50"`
	UserID               uint64    `json:"user_id" gorm:"index"`
	Status               string    `json:"status" gorm:"size:50;default:draft"`
	CharacterName        string    `json:"character_name" gorm:"size:200"`
	CharacterSpecies     string    `json:"character_species" gorm:"size:100"`
	Style                string    `json:"style" gorm:"size:100"`
	Size                 string    `json:"size" gorm:"size:50"`
	Features             string    `json:"features" gorm:"type:json"`
	BudgetMinCents       *uint64   `json:"budget_min_cents"`
	BudgetMaxCents       *uint64   `json:"budget_max_cents"`
	DeadlineDate         *string   `json:"deadline_date"`
	Description          string    `json:"description"`
	ReferenceFiles       string    `json:"reference_files" gorm:"type:json"`
	CopyrightDeclaration string    `json:"copyright_declaration"`
	CulturalFlag         bool      `json:"cultural_flag" gorm:"default:false"`
	CulturalNotes        string    `json:"cultural_notes"`
	MakerID              *uint64   `json:"maker_id"`
	EstimatedStart       *string   `json:"estimated_start"`
	EstimatedEnd         *string   `json:"estimated_end"`
	InternalNotes        string    `json:"internal_notes"`
	Version              int       `json:"version" gorm:"default:1"`
	User                 *User     `json:"user,omitempty"`
	Maker                *User     `json:"maker,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type CommissionStatusHistory struct {
	ID           uint64    `json:"id" gorm:"primaryKey"`
	CommissionID uint64    `json:"commission_id" gorm:"index"`
	FromStatus   string    `json:"from_status"`
	ToStatus     string    `json:"to_status"`
	ActorID      *uint64   `json:"actor_id"`
	Reason       string    `json:"reason"`
	Metadata     string    `json:"metadata" gorm:"type:json"`
	CreatedAt    time.Time `json:"created_at"`
}

type Quote struct {
	ID                 uint64     `json:"id" gorm:"primaryKey"`
	QuoteNumber        string     `json:"quote_number" gorm:"uniqueIndex;size:50"`
	CommissionID       uint64     `json:"commission_id" gorm:"index"`
	Version            int        `json:"version" gorm:"default:1"`
	Status             string     `json:"status" gorm:"size:20;default:draft"`
	Items              string     `json:"items" gorm:"type:json"`
	SubtotalCents      uint64     `json:"subtotal_cents"`
	TaxCents           uint64     `json:"tax_cents"`
	TotalCents         uint64     `json:"total_cents"`
	DepositPercent     int        `json:"deposit_percent" gorm:"default:50"`
	DepositAmountCents uint64     `json:"deposit_amount_cents"`
	EstimatedDays      int        `json:"estimated_days"`
	Terms              string     `json:"terms"`
	ExpiresAt          *time.Time `json:"expires_at"`
	AcceptedAt         *time.Time `json:"accepted_at"`
	RejectedAt         *time.Time `json:"rejected_at"`
	RejectionReason    string     `json:"rejection_reason"`
	SupersededBy       *uint64    `json:"superseded_by"`
	CreatedBy          *uint64    `json:"created_by"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// Support
type SupportTicket struct {
	ID           uint64          `json:"id" gorm:"primaryKey"`
	TicketNumber string          `json:"ticket_number" gorm:"uniqueIndex;size:50"`
	UserID       uint64          `json:"user_id" gorm:"index"`
	OrderID      *uint64         `json:"order_id"`
	CommissionID *uint64         `json:"commission_id"`
	Type         string          `json:"type" gorm:"size:20"`
	Status       string          `json:"status" gorm:"size:20;default:open"`
	Priority     string          `json:"priority" gorm:"size:10;default:medium"`
	Subject      string          `json:"subject" gorm:"size:500"`
	AssignedTo   *uint64         `json:"assigned_to"`
	SLADueAt     *time.Time      `json:"sla_due_at"`
	ResolvedAt   *time.Time      `json:"resolved_at"`
	ClosedAt     *time.Time      `json:"closed_at"`
	Resolution   string          `json:"resolution"`
	User         *User           `json:"user,omitempty"`
	Messages     []TicketMessage `json:"messages,omitempty" gorm:"foreignKey:TicketID"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type TicketMessage struct {
	ID          uint64    `json:"id" gorm:"primaryKey"`
	TicketID    uint64    `json:"ticket_id" gorm:"index"`
	SenderID    uint64    `json:"sender_id"`
	Message     string    `json:"message"`
	Attachments string    `json:"attachments" gorm:"type:json"`
	IsInternal  bool      `json:"is_internal" gorm:"default:false"`
	Sender      *User     `json:"sender,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// Audit
type AuditLog struct {
	ID           uint64    `json:"id" gorm:"primaryKey"`
	ActorID      *uint64   `json:"actor_id"`
	Action       string    `json:"action" gorm:"size:100"`
	ResourceType string    `json:"resource_type" gorm:"size:50"`
	ResourceID   *uint64   `json:"resource_id"`
	BeforeState  string    `json:"before_state" gorm:"type:json"`
	AfterState   string    `json:"after_state" gorm:"type:json"`
	IPAddress    string    `json:"ip_address" gorm:"size:45"`
	UserAgent    string    `json:"user_agent" gorm:"size:500"`
	RequestID    string    `json:"request_id" gorm:"size:100"`
	CreatedAt    time.Time `json:"created_at"`
}

// CMS
type Page struct {
	ID          uint64     `json:"id" gorm:"primaryKey"`
	Slug        string     `json:"slug" gorm:"uniqueIndex;size:200"`
	Title       string     `json:"title" gorm:"size:500"`
	Content     string     `json:"content"`
	Status      string     `json:"status" gorm:"size:20;default:draft"`
	Version     int        `json:"version" gorm:"default:1"`
	PublishedAt *time.Time `json:"published_at"`
	CreatedBy   *uint64    `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CommissionConfig struct {
	ID                uint64    `json:"id" gorm:"primaryKey"`
	Status            string    `json:"status" gorm:"size:20;default:closed"`
	MaxSlots          int       `json:"max_slots" gorm:"default:0"`
	BookedSlots       int       `json:"booked_slots" gorm:"default:0"`
	WaitlistEnabled   bool      `json:"waitlist_enabled" gorm:"default:false"`
	MinDepositPercent int       `json:"min_deposit_percent" gorm:"default:50"`
	QuoteValidityDays int       `json:"quote_validity_days" gorm:"default:14"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (CommissionConfig) TableName() string {
	return "commission_config"
}

// RefreshToken - server-side session management
type RefreshToken struct {
	ID        uint64     `json:"id" gorm:"primaryKey"`
	UserID    uint64     `json:"user_id" gorm:"index"`
	TokenHash string     `json:"-" gorm:"uniqueIndex;size:255"`
	UserAgent string     `json:"user_agent" gorm:"size:500"`
	IPAddress string     `json:"ip_address" gorm:"size:45"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"index"`
	RevokedAt *time.Time `json:"revoked_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// SecurityLog - security event tracking
type SecurityLog struct {
	ID        uint64    `json:"id" gorm:"primaryKey"`
	UserID    *uint64   `json:"user_id" gorm:"index"`
	Event     string    `json:"event" gorm:"size:100;index"`
	IPAddress string    `json:"ip_address" gorm:"size:45"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	Details   string    `json:"details" gorm:"type:json"`
	CreatedAt time.Time `json:"created_at"`
}

// CommissionMilestone - for milestone tracking
type CommissionMilestone struct {
	ID           uint64     `json:"id" gorm:"primaryKey"`
	CommissionID uint64     `json:"commission_id" gorm:"index"`
	Title        string     `json:"title" gorm:"size:200"`
	Description  string     `json:"description"`
	Status       string     `json:"status" gorm:"size:20;default:pending"`
	DueDate      *time.Time `json:"due_date"`
	CompletedAt  *time.Time `json:"completed_at"`
	SortOrder    int        `json:"sort_order" gorm:"default:0"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CommissionChangeRequest - change request tracking
type CommissionChangeRequest struct {
	ID           uint64    `json:"id" gorm:"primaryKey"`
	CommissionID uint64    `json:"commission_id" gorm:"index"`
	RequestedBy  uint64    `json:"requested_by"`
	Description  string    `json:"description"`
	Status       string    `json:"status" gorm:"size:20;default:pending"`
	AdminNotes   string    `json:"admin_notes"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// RefundRecord - offline refund tracking
type RefundRecord struct {
	ID          uint64     `json:"id" gorm:"primaryKey"`
	PaymentID   uint64     `json:"payment_id" gorm:"index"`
	OrderID     uint64     `json:"order_id" gorm:"index"`
	AmountCents uint64     `json:"amount_cents"`
	Reason      string     `json:"reason"`
	Reference   string     `json:"reference" gorm:"size:200"`
	ProcessedBy *uint64    `json:"processed_by"`
	ProcessedAt *time.Time `json:"processed_at"`
	Status      string     `json:"status" gorm:"size:20;default:pending"`
	AuditNote   string     `json:"audit_note"`
	CreatedAt   time.Time  `json:"created_at"`
}

// EmailOutbox - reliable email delivery
type EmailOutbox struct {
	ID         uint64     `json:"id" gorm:"primaryKey"`
	To         string     `json:"to" gorm:"size:255;index"`
	Subject    string     `json:"subject" gorm:"size:500"`
	Body       string     `json:"body" gorm:"type:text"`
	Status     string     `json:"status" gorm:"size:20;default:pending;index"`
	Retries    int        `json:"retries" gorm:"default:0"`
	MaxRetries int        `json:"max_retries" gorm:"default:3"`
	LastError  string     `json:"last_error"`
	SentAt     *time.Time `json:"sent_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// IdempotencyRecord - idempotency key tracking
type IdempotencyRecord struct {
	ID        uint64    `json:"id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"uniqueIndex;size:255"`
	Response  string    `json:"response" gorm:"type:json"`
	UserID    uint64    `json:"user_id" gorm:"index"`
	ExpiresAt time.Time `json:"expires_at" gorm:"index"`
	CreatedAt time.Time `json:"created_at"`
}

// PageVersion - CMS versioning
type PageVersion struct {
	ID        uint64    `json:"id" gorm:"primaryKey"`
	PageID    uint64    `json:"page_id" gorm:"index"`
	Version   int       `json:"version"`
	Title     string    `json:"title" gorm:"size:500"`
	Content   string    `json:"content"`
	ChangedBy *uint64   `json:"changed_by"`
	CreatedAt time.Time `json:"created_at"`
}

func (OrderStatusHistory) TableName() string      { return "order_status_history" }
func (CommissionStatusHistory) TableName() string { return "commission_status_history" }
