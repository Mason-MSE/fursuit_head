package dto

type RegisterRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required,min=12"`
	PasswordConfirm  string `json:"password_confirm" binding:"required,min=12"`
	FullName         string `json:"full_name" binding:"required,min=2,max=200"`
	MarketingConsent bool   `json:"marketing_consent"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID               uint64         `json:"id"`
	Email            string         `json:"email"`
	FullName         string         `json:"full_name"`
	Phone            *string        `json:"phone"`
	AvatarURL        *string        `json:"avatar_url"`
	Status           string         `json:"status"`
	EmailVerifiedAt  *string        `json:"email_verified_at"`
	MarketingConsent bool           `json:"marketing_consent"`
	Roles            []RoleResponse `json:"roles"`
	Permissions      []string       `json:"permissions"`
	CreatedAt        string         `json:"created_at"`
}

type RoleResponse struct {
	ID          uint64   `json:"id"`
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	IsSystem    bool     `json:"is_system"`
	Permissions []string `json:"permissions"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token           string `json:"token" binding:"required"`
	Password        string `json:"password" binding:"required,min=12"`
	PasswordConfirm string `json:"password_confirm" binding:"required,min=12"`
}

type ChangePasswordRequest struct {
	OldPassword     string `json:"old_password" binding:"required"`
	Password        string `json:"password" binding:"required,min=12"`
	PasswordConfirm string `json:"password_confirm" binding:"required,min=12"`
}

// Address
type AddressRequest struct {
	Label      string `json:"label"`
	FullName   string `json:"full_name" binding:"required"`
	Phone      string `json:"phone"`
	Line1      string `json:"line1" binding:"required"`
	Line2      string `json:"line2"`
	City       string `json:"city" binding:"required"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code" binding:"required"`
	Country    string `json:"country"`
	IsDefault  bool   `json:"is_default"`
}

// Product
type ProductCreateRequest struct {
	CategoryID       *uint64 `json:"category_id"`
	SKU              string  `json:"sku"`
	Name             string  `json:"name" binding:"required"`
	Slug             string  `json:"slug" binding:"required"`
	Description      string  `json:"description"`
	ShortDescription string  `json:"short_description"`
	BasePriceCents   uint64  `json:"base_price_cents" binding:"required"`
	Currency         string  `json:"currency"`
	ProductType      string  `json:"product_type"`
	MainImageURL     string  `json:"main_image_url"`
	CareInstructions string  `json:"care_instructions"`
	SafetyNotes      string  `json:"safety_notes"`
	EstimatedDaysMin *int    `json:"estimated_days_min"`
	EstimatedDaysMax *int    `json:"estimated_days_max"`
}

type ProductUpdateRequest struct {
	CategoryID       *uint64 `json:"category_id"`
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	ShortDescription string  `json:"short_description"`
	BasePriceCents   *uint64 `json:"base_price_cents"`
	ProductType      string  `json:"product_type"`
	Status           string  `json:"status"`
	MainImageURL     string  `json:"main_image_url"`
	CareInstructions string  `json:"care_instructions"`
	SafetyNotes      string  `json:"safety_notes"`
}

type VariantCreateRequest struct {
	Name        string `json:"name" binding:"required"`
	SKU         string `json:"sku"`
	PriceCents  uint64 `json:"price_cents" binding:"required"`
	StockOnHand int    `json:"stock_on_hand"`
}

// Cart
type CartItemRequest struct {
	VariantID uint64 `json:"variant_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// Order
type OrderCreateRequest struct {
	ShippingAddressID uint64 `json:"shipping_address_id" binding:"required"`
	ShippingMethod    string `json:"shipping_method"`
	Notes             string `json:"notes"`
	IdempotencyKey    string `json:"idempotency_key"`
}

type OrderStatusUpdateRequest struct {
	Status         string `json:"status" binding:"required"`
	Reason         string `json:"reason"`
	TrackingNumber string `json:"tracking_number"`
}

// Payment
type PaymentConfirmRequest struct {
	PaymentID uint64 `json:"payment_id" binding:"required"`
	Status    string `json:"status" binding:"required"`
	Notes     string `json:"notes"`
}

type BankTransferUploadRequest struct {
	OrderID         uint64 `json:"order_id" binding:"required"`
	AmountCents     uint64 `json:"amount_cents" binding:"required"`
	ReceiptURL      string `json:"receipt_url"`
	ReceiptFilename string `json:"receipt_filename"`
	BankReference   string `json:"bank_reference"`
}

// Commission
type CommissionCreateRequest struct {
	ReferenceFiles       string      `json:"reference_files"`
	CharacterName        string      `json:"character_name" binding:"required"`
	CharacterSpecies     string      `json:"character_species"`
	Style                string      `json:"style"`
	Size                 string      `json:"size"`
	Features             interface{} `json:"features"`
	BudgetMinCents       *uint64     `json:"budget_min_cents"`
	BudgetMaxCents       *uint64     `json:"budget_max_cents"`
	DeadlineDate         string      `json:"deadline_date"`
	Description          string      `json:"description"`
	CopyrightDeclaration string      `json:"copyright_declaration"`
	ColorPalette         string      `json:"color_palette"`
	JawType              string      `json:"jaw_type"`
	EyeType              string      `json:"eye_type"`
	EarType              string      `json:"ear_type"`
	Options              interface{} `json:"options"`
	AdditionalNotes      string      `json:"additional_notes"`
}

type CommissionUpdateRequest struct {
	CharacterName    string  `json:"character_name"`
	CharacterSpecies string  `json:"character_species"`
	Style            string  `json:"style"`
	Size             string  `json:"size"`
	Features         string  `json:"features"`
	InternalNotes    string  `json:"internal_notes"`
	MakerID          *uint64 `json:"maker_id"`
	EstimatedStart   string  `json:"estimated_start"`
	EstimatedEnd     string  `json:"estimated_end"`
}

type QuoteCreateRequest struct {
	CommissionID   uint64 `json:"commission_id" binding:"required"`
	Items          string `json:"items" binding:"required"`
	SubtotalCents  uint64 `json:"subtotal_cents" binding:"required"`
	TaxCents       uint64 `json:"tax_cents"`
	DepositPercent int    `json:"deposit_percent"`
	EstimatedDays  int    `json:"estimated_days"`
	Terms          string `json:"terms"`
}

type QuoteAcceptRequest struct {
	Accept bool   `json:"accept"`
	Reason string `json:"reason"`
}

// Support
type TicketCreateRequest struct {
	OrderID      *uint64 `json:"order_id"`
	CommissionID *uint64 `json:"commission_id"`
	Type         string  `json:"type" binding:"required"`
	Subject      string  `json:"subject" binding:"required"`
	Message      string  `json:"message" binding:"required"`
	Priority     string  `json:"priority"`
}

type TicketMessageRequest struct {
	Message    string `json:"message" binding:"required"`
	IsInternal bool   `json:"is_internal"`
}

type TicketStatusUpdateRequest struct {
	Status string `json:"status" binding:"required"`
	Reason string `json:"reason"`
}

// CMS Pages
type PageCreateRequest struct {
	Slug    string `json:"slug" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
}

type PageUpdateRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Status  string `json:"status"`
}

// Commission Config
type CommissionConfigUpdateRequest struct {
	Status            string `json:"status"`
	MaxSlots          *int   `json:"max_slots"`
	WaitlistEnabled   *bool  `json:"waitlist_enabled"`
	MinDepositPercent *int   `json:"min_deposit_percent"`
	QuoteValidityDays *int   `json:"quote_validity_days"`
}

// Admin
type UserUpdateAdminRequest struct {
	Status    string   `json:"status"`
	RoleCodes []string `json:"role_codes"`
	FullName  string   `json:"full_name"`
	Phone     string   `json:"phone"`
}

type RoleCreateRequest struct {
	Code          string   `json:"code" binding:"required"`
	Name          string   `json:"name" binding:"required"`
	Description   string   `json:"description"`
	PermissionIDs []uint64 `json:"permission_ids"`
}

type RoleUpdateRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	PermissionIDs []uint64 `json:"permission_ids"`
}

type PaginationRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"page_size,default=20"`
	Sort     string `form:"sort"`
	Order    string `form:"order,default=desc"`
	Search   string `form:"search"`
	Status   string `form:"status"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

type APIError struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

type AuditLogListRequest struct {
	Page         int    `form:"page,default=1"`
	PageSize     int    `form:"page_size,default=20"`
	ActorID      string `form:"actor_id"`
	ResourceType string `form:"resource_type"`
	ResourceID   string `form:"resource_id"`
	Action       string `form:"action"`
	DateFrom     string `form:"date_from"`
	DateTo       string `form:"date_to"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}
