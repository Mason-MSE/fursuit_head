package service

import "testing"

// Contract cases from requirements 4.2 and P1-ORDER-001.
func TestOrderStateContract(t *testing.T) {
	f := NewOrderFSM(nil)
	for _, tt := range []struct {
		from, to string
		allowed  bool
	}{
		{"awaiting_payment", "paid", true}, {"awaiting_payment", "cancelled", true}, {"paid", "processing", true}, {"processing", "ready_to_ship", true}, {"ready_to_ship", "shipped", true}, {"shipped", "delivered", true}, {"delivered", "completed", true},
		{"awaiting_payment", "shipped", false}, {"paid", "shipped", false}, {"shipped", "cancelled", false}, {"completed", "processing", false}, {"cancelled", "paid", false}, {"paid", "paid", false}, {"invented", "paid", false},
	} {
		if got := f.CanTransition(tt.from, tt.to); got != tt.allowed {
			t.Errorf("%s -> %s = %v", tt.from, tt.to, got)
		}
	}
}
