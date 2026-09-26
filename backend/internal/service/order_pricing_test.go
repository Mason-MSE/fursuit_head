package service

import (
	"testing"
)

func calculateLineTotal(unitPriceCents uint64, quantity int) uint64 {
	return unitPriceCents * uint64(quantity)
}

func calculateLineTax(lineTotalCents uint64, gstRate float64) uint64 {
	return uint64(float64(lineTotalCents) * gstRate / 100.0)
}

func calculateOrderTotal(subtotalCents, taxCents, shippingCents uint64) uint64 {
	return subtotalCents + taxCents + shippingCents
}

func TestCalculateLineTotal(t *testing.T) {
	tests := []struct {
		name      string
		unitPrice uint64
		quantity  int
		expected  uint64
	}{
		{"single item", 1000, 1, 1000},
		{"two items", 1000, 2, 2000},
		{"three items", 1500, 3, 4500},
		{"zero price", 0, 5, 0},
		{"zero quantity", 1000, 0, 0},
		{"large quantity", 99, 1000, 99000},
		{"high value item", 50000, 1, 50000},
		{"fraction cent edge", 1, 1, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateLineTotal(tt.unitPrice, tt.quantity)
			if got != tt.expected {
				t.Errorf("calculateLineTotal(%d, %d) = %d, want %d", tt.unitPrice, tt.quantity, got, tt.expected)
			}
		})
	}
}

func TestCalculateGST(t *testing.T) {
	tests := []struct {
		name          string
		subtotalCents uint64
		gstRate       float64
		expectedTax   uint64
	}{
		{"15% of $100", 10000, 15.0, 1500},
		{"15% of $1", 100, 15.0, 15},
		{"15% of 9999 cents", 9999, 15.0, 1499},
		{"15% of 1 cent", 1, 15.0, 0},
		{"15% of zero", 0, 15.0, 0},
		{"15% of large amount", 1000000, 15.0, 150000},
		{"0% tax rate", 10000, 0.0, 0},
		{"10% GST rate", 10000, 10.0, 1000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateLineTax(tt.subtotalCents, tt.gstRate)
			if got != tt.expectedTax {
				t.Errorf("calculateGST(%d, %.1f) = %d, want %d", tt.subtotalCents, tt.gstRate, got, tt.expectedTax)
			}
		})
	}
}

func TestCalculateOrderTotal(t *testing.T) {
	tests := []struct {
		name     string
		subtotal uint64
		tax      uint64
		shipping uint64
		expected uint64
	}{
		{"typical order", 10000, 1500, 500, 12000},
		{"zero everything", 0, 0, 0, 0},
		{"no tax", 10000, 0, 500, 10500},
		{"no shipping", 10000, 1500, 0, 11500},
		{"tax only", 0, 1500, 0, 1500},
		{"shipping only", 0, 0, 800, 800},
		{"large order", 500000, 75000, 1500, 576500},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateOrderTotal(tt.subtotal, tt.tax, tt.shipping)
			if got != tt.expected {
				t.Errorf("calculateOrderTotal(%d, %d, %d) = %d, want %d", tt.subtotal, tt.tax, tt.shipping, got, tt.expected)
			}
		})
	}
}

func TestPricing_FormulaConsistency(t *testing.T) {
	unitPrice := uint64(2500)
	quantity := 3
	gstRate := 15.0
	shippingCents := uint64(800)

	lineTotal := calculateLineTotal(unitPrice, quantity)
	lineTax := calculateLineTax(lineTotal, gstRate)
	orderTotal := calculateOrderTotal(lineTotal, lineTax, shippingCents)

	if lineTotal != 7500 {
		t.Errorf("lineTotal = %d, want 7500", lineTotal)
	}
	if lineTax != 1125 {
		t.Errorf("lineTax = %d, want 1125", lineTax)
	}
	if orderTotal != 9425 {
		t.Errorf("orderTotal = %d, want 9425", orderTotal)
	}
}

func TestPricing_GSTTruncationBehavior(t *testing.T) {
	testCases := []struct {
		lineTotal uint64
		gstRate   float64
	}{
		{99, 15.0},
		{101, 15.0},
		{333, 15.0},
		{667, 15.0},
		{1, 15.0},
	}

	for _, tc := range testCases {
		tax := calculateLineTax(tc.lineTotal, tc.gstRate)
		expected := uint64(float64(tc.lineTotal) * tc.gstRate / 100.0)
		if tax != expected {
			t.Errorf("calculateGST(%d, %.1f) = %d, want %d", tc.lineTotal, tc.gstRate, tax, expected)
		}
	}
}
