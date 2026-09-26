package service

import (
	"testing"
)

func TestCommissionFSM_CanTransition(t *testing.T) {
	fsm := NewCommissionFSM(nil)

	tests := []struct {
		name     string
		from     string
		to       string
		expected bool
	}{
		// Happy path
		{"draft to submitted", "draft", "submitted", true},
		{"submitted to reviewing", "submitted", "reviewing", true},
		{"reviewing to quoted", "reviewing", "quoted", true},
		{"quoted to deposit_pending", "quoted", "deposit_pending", true},
		{"deposit_pending to deposit_received", "deposit_pending", "deposit_received", true},
		{"deposit_received to in_progress", "deposit_received", "in_progress", true},
		{"in_progress to stage_review", "in_progress", "stage_review", true},
		{"stage_review to in_progress", "stage_review", "in_progress", true},
		{"stage_review to stage_approved", "stage_review", "stage_approved", true},
		{"stage_approved to in_progress", "stage_approved", "in_progress", true},
		{"in_progress to final_review", "in_progress", "final_review", true},
		{"final_review to completed", "final_review", "completed", true},
		{"final_review to revision_requested", "final_review", "revision_requested", true},
		{"revision_requested to in_progress", "revision_requested", "in_progress", true},

		// Cancellation from various states
		{"draft to cancelled", "draft", "cancelled", true},
		{"submitted to cancelled", "submitted", "cancelled", true},
		{"reviewing to cancelled", "reviewing", "cancelled", true},
		{"quoted to cancelled", "quoted", "cancelled", true},
		{"deposit_pending to cancelled", "deposit_pending", "cancelled", true},
		{"deposit_received to cancelled", "deposit_received", "cancelled", true},
		{"in_progress to cancelled", "in_progress", "cancelled", true},
		{"stage_review to cancelled", "stage_review", "cancelled", true},
		{"stage_approved to cancelled", "stage_approved", "cancelled", true},
		{"final_review to cancelled", "final_review", "cancelled", true},
		{"revision_requested to cancelled", "revision_requested", "cancelled", true},

		// Dispute transitions
		{"submitted to disputed", "submitted", "disputed", true},
		{"reviewing to disputed", "reviewing", "disputed", true},
		{"quoted to disputed", "quoted", "disputed", true},
		{"deposit_pending to disputed", "deposit_pending", "disputed", true},
		{"deposit_received to disputed", "deposit_received", "disputed", true},
		{"in_progress to disputed", "in_progress", "disputed", true},
		{"stage_review to disputed", "stage_review", "disputed", true},
		{"stage_approved to disputed", "stage_approved", "disputed", true},
		{"final_review to disputed", "final_review", "disputed", true},
		{"revision_requested to disputed", "revision_requested", "disputed", true},

		// Dispute resolution
		{"disputed to in_progress", "disputed", "in_progress", true},
		{"disputed to cancelled", "disputed", "cancelled", true},

		// Invalid transitions
		{"draft to completed", "draft", "completed", false},
		{"draft to in_progress", "draft", "in_progress", false},
		{"draft to cancelled then back", "cancelled", "in_progress", false},
		{"completed to cancelled", "completed", "cancelled", false},
		{"completed to in_progress", "completed", "in_progress", false},
		{"cancelled to in_progress", "cancelled", "in_progress", false},
		{"cancelled to submitted", "cancelled", "submitted", false},
		{"submitted to completed", "submitted", "completed", false},
		{"reviewing to deposit_pending", "reviewing", "deposit_pending", false},
		{"in_progress to completed", "in_progress", "completed", false},
		{"in_progress to submitted", "in_progress", "submitted", false},

		// Self-transitions
		{"same state draft", "draft", "draft", false},
		{"same state in_progress", "in_progress", "in_progress", false},
		{"same state completed", "completed", "completed", false},
		{"same state cancelled", "cancelled", "cancelled", false},

		// Unknown states
		{"unknown state", "unknown", "submitted", false},
		{"to unknown state", "draft", "unknown", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := fsm.CanTransition(tt.from, tt.to)
			if got != tt.expected {
				t.Errorf("CanTransition(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.expected)
			}
		})
	}
}

func TestCommissionFSM_TransitionMatrix_Completeness(t *testing.T) {
	expectedStates := []string{
		"draft", "submitted", "reviewing", "quoted",
		"deposit_pending", "deposit_received", "in_progress",
		"stage_review", "stage_approved", "final_review",
		"revision_requested", "disputed", "completed", "cancelled",
	}
	fsm := NewCommissionFSM(nil)

	for _, state := range expectedStates {
		if _, ok := commissionAllowedTransitions[state]; !ok {
			t.Errorf("state %q missing from transition map", state)
		}
	}

	totalTransitions := 0
	for from, targets := range commissionAllowedTransitions {
		totalTransitions += len(targets)
		for _, to := range targets {
			if !fsm.CanTransition(from, to) {
				t.Errorf("transition %s -> %s declared in map but CanTransition returns false", from, to)
			}
		}
	}

	if totalTransitions < 30 {
		t.Errorf("expected at least 30 total transitions, got %d", totalTransitions)
	}
}
