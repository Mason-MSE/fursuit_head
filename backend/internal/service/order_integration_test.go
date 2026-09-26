package service

import (
	"fmt"
	"github.com/fursuit-platform/backend/internal/dto"
	"github.com/fursuit-platform/backend/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"sync"
	"testing"
	"time"
)

func orderFixture(t *testing.T, db *gorm.DB) (model.User, model.Address, model.ProductVariant) {
	t.Helper()
	now := time.Now().UTC()
	id := uuid.NewString()
	user := model.User{Email: id + "@example.test", PasswordHash: "test-only", FullName: "Order test", Status: "active", EmailVerifiedAt: &now}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	address := model.Address{UserID: user.ID, FullName: "Order test", Line1: "1 Test Street", City: "Auckland", Country: "NZ", PostalCode: "1010"}
	if err := db.Create(&address).Error; err != nil {
		t.Fatal(err)
	}
	product := model.Product{SKU: id, Slug: id, Name: "Test head", Status: "published", Currency: "NZD", BasePriceCents: 10000, GSTRate: 15}
	if err := db.Create(&product).Error; err != nil {
		t.Fatal(err)
	}
	variant := model.ProductVariant{ProductID: product.ID, Name: "Standard", SKU: id + "-v", PriceCents: 10000, StockOnHand: 1, Attributes: "{}", IsActive: true}
	if err := db.Create(&variant).Error; err != nil {
		t.Fatal(err)
	}
	cart := model.Cart{UserID: user.ID}
	if err := db.Create(&cart).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&model.CartItem{CartID: cart.ID, VariantID: variant.ID, Quantity: 1, PriceCentsSnapshot: 1}).Error; err != nil {
		t.Fatal(err)
	}
	return user, address, variant
}
func TestOrderTransactionMySQL(t *testing.T) {
	db := integrationDB(t)
	user, address, variant := orderFixture(t, db)
	svc := NewOrderService(db, NewInventoryService(db))
	req := dto.OrderCreateRequest{ShippingAddressID: address.ID, ShippingMethod: "manual", IdempotencyKey: uuid.NewString()}
	order, err := svc.CreateOrder(user.ID, req)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != "awaiting_payment" || order.TotalCents != 11500 || order.Items[0].UnitPriceCents != 10000 {
		t.Fatalf("wrong server pricing/state: %+v", order)
	}
	replay, err := svc.CreateOrder(user.ID, req)
	if err != nil || replay.ID != order.ID {
		t.Fatalf("replay failed: %v", err)
	}
	if _, err := svc.GetOrder(user.ID+1000000, order.ID); err == nil {
		t.Fatal("IDOR")
	}
	if _, err := svc.UpdateOrderStatus(order.ID, dto.OrderStatusUpdateRequest{Status: "paid"}, user.ID); err == nil {
		t.Fatal("status edit bypassed payment")
	}
	if _, err := svc.UpdateOrderStatus(order.ID, dto.OrderStatusUpdateRequest{Status: "shipped", TrackingNumber: "TEST"}, user.ID); err == nil {
		t.Fatal("unpaid shipment")
	}
	payment := model.Payment{PaymentNumber: "TEST-" + uuid.NewString(), OrderID: order.ID, Type: "full", Method: "bank_transfer", Status: "pending", AmountCents: order.TotalCents, Currency: "NZD"}
	if err := db.Create(&payment).Error; err != nil {
		t.Fatal(err)
	}
	paySvc := NewPaymentService(db)
	for i := 0; i < 2; i++ {
		if _, err := paySvc.ConfirmPayment(payment.ID, dto.PaymentConfirmRequest{Status: "completed"}, user.ID); err != nil {
			t.Fatal(err)
		}
	}
	for _, state := range []string{"processing", "ready_to_ship", "shipped", "delivered", "completed"} {
		if _, err := svc.UpdateOrderStatus(order.ID, dto.OrderStatusUpdateRequest{Status: state, TrackingNumber: "TEST-TRACK"}, user.ID); err != nil {
			t.Fatalf("%s: %v", state, err)
		}
	}
	if err := db.First(&variant, variant.ID).Error; err != nil {
		t.Fatal(err)
	}
	if variant.StockOnHand != 0 || variant.StockReserved != 0 {
		t.Fatalf("inventory wrong %+v", variant)
	}
	var n int64
	db.Model(&model.OrderStatusHistory{}).Where("order_id = ? AND to_status = ?", order.ID, "paid").Count(&n)
	if n != 1 {
		t.Fatalf("payment history duplicated: %d", n)
	}
}
func TestOrderCancelAndConcurrencyMySQL(t *testing.T) {
	db := integrationDB(t)
	u, a, v := orderFixture(t, db)
	svc := NewOrderService(db, NewInventoryService(db))
	req := dto.OrderCreateRequest{ShippingAddressID: a.ID, IdempotencyKey: uuid.NewString()}
	var wg sync.WaitGroup
	results := make(chan *model.Order, 2)
	errs := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); o, e := svc.CreateOrder(u.ID, req); results <- o; errs <- e }()
	}
	wg.Wait()
	close(results)
	close(errs)
	for e := range errs {
		if e != nil {
			t.Fatal(e)
		}
	}
	var id uint64
	for o := range results {
		if id != 0 && id != o.ID {
			t.Fatal("duplicate checkout")
		}
		id = o.ID
	}
	for i := 0; i < 2; i++ {
		if _, err := svc.CancelOrder(u.ID, id, "Changed mind"); err != nil {
			t.Fatal(err)
		}
	}
	db.First(&v, v.ID)
	if v.StockReserved != 0 || v.StockOnHand != 1 {
		t.Fatal("cancel did not release exactly once")
	}
	if err := NewInventoryService(db).AdjustStock(v.ID, -2, "invalid", u.ID); err == nil {
		t.Fatal("negative inventory accepted")
	}
	// Two customers compete for the final unit using the same caller key.
	u2, a2, _ := orderFixture(t, db)
	var cart model.Cart
	db.Where("user_id = ?", u2.ID).First(&cart)
	db.Model(&model.CartItem{}).Where("cart_id = ?", cart.ID).Update("variant_id", v.ID)
	var ownCart model.Cart
	db.Where("user_id = ?", u.ID).First(&ownCart)
	db.Create(&model.CartItem{CartID: ownCart.ID, VariantID: v.ID, Quantity: 1})
	errors := make(chan error, 2)
	for _, candidate := range []struct{ user, address uint64 }{{u.ID, a.ID}, {u2.ID, a2.ID}} {
		wg.Add(1)
		go func(user, address uint64) {
			defer wg.Done()
			_, err := svc.CreateOrder(user, dto.OrderCreateRequest{ShippingAddressID: address, IdempotencyKey: "shared-final-stock"})
			errors <- err
		}(candidate.user, candidate.address)
	}
	wg.Wait()
	close(errors)
	success := 0
	for err := range errors {
		if err == nil {
			success++
		}
	}
	if success != 1 {
		t.Fatal(fmt.Sprintf("last unit allocated %d times", success))
	}
}
