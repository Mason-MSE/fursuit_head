package service

import (
	"strings"
	"testing"
)

func TestValidatePasswordStrength(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{"too short", "Ab1!abcd", true},
		{"11 chars", "Abcd1234!@#", true},
		{"min length ok", "Abcd1234!@#$", false},
		{"no uppercase", "abcd1234!@#$", true},
		{"no lowercase", "ABCD1234!@#$", true},
		{"no digit", "Abcdefgh!@#$", true},
		{"no special", "Abcdefgh1234", true},
		{"common password lowercase", "password1234!", true},
		{"repeating chars", "Aaaa1111!@@@", true},
		{"good password", "MyP@ssw0rd123", false},
		{"long good password", "Tr0ub4dor&3xYz", false},
		{"mixed specials", "Ab1#def$gh2%", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePasswordStrength(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePasswordStrength(%q) error = %v, wantErr %v", tt.password, err, tt.wantErr)
			}
		})
	}
}

func TestValidatePassword_Requirements(t *testing.T) {
	t.Run("must have uppercase", func(t *testing.T) {
		err := validatePasswordStrength("lowercase123!@")
		if err == nil {
			t.Error("expected error for no uppercase")
		}
		if !strings.Contains(err.Error(), "uppercase") {
			t.Errorf("error should mention uppercase, got: %s", err.Error())
		}
	})

	t.Run("must have lowercase", func(t *testing.T) {
		err := validatePasswordStrength("UPPERCASE123!@")
		if err == nil {
			t.Error("expected error for no lowercase")
		}
		if !strings.Contains(err.Error(), "uppercase") {
			t.Errorf("error should mention character requirements, got: %s", err.Error())
		}
	})

	t.Run("must have digit", func(t *testing.T) {
		err := validatePasswordStrength("NoDigits!@#$%^")
		if err == nil {
			t.Error("expected error for no digit")
		}
		if !strings.Contains(err.Error(), "uppercase") {
			t.Errorf("error should mention character requirements, got: %s", err.Error())
		}
	})

	t.Run("must have special char", func(t *testing.T) {
		err := validatePasswordStrength("NoSpecial12345")
		if err == nil {
			t.Error("expected error for no special character")
		}
		if !strings.Contains(err.Error(), "uppercase") {
			t.Errorf("error should mention character requirements, got: %s", err.Error())
		}
	})

	t.Run("too short", func(t *testing.T) {
		err := validatePasswordStrength("Ab1!")
		if err == nil {
			t.Error("expected error for short password")
		}
		if !strings.Contains(err.Error(), "12 characters") {
			t.Errorf("error should mention length, got: %s", err.Error())
		}
	})
}

func TestWeakPasswords(t *testing.T) {
	weak := []string{
		"password",
		"123456789012",
		"qwertyuiop12",
		"abcdefghijk1",
		"password1234",
		"letmein123456",
		"welcome12345",
		"admin1234567",
		"changeme1234",
	}

	for _, p := range weak {
		if _, exists := weakPasswords[p]; !exists {
			t.Errorf("expected %q to be in weakPasswords map", p)
		}
	}
}

func TestWeakPassword_CaseInsensitive(t *testing.T) {
	lower := "password"
	upper := "PASSWORD"

	if _, exists := weakPasswords[lower]; !exists {
		t.Errorf("expected %q to be weak", lower)
	}

	err := validatePasswordStrength(upper + "1234!@#$")
	if err == nil {
		t.Errorf("expected common password %q to be rejected", upper)
	}

	err = validatePasswordStrength("password" + "1234!@#$")
	if err == nil {
		t.Errorf("expected common password %q to be rejected", "password...")
	}
}

func TestRepeatingCharacters(t *testing.T) {
	tests := []struct {
		password string
		wantErr  bool
	}{
		{"Aaa1111!@@@", true},
		{"AAA1111!@@@", true},
		{"1111AAAA!@@@", true},
		{"Ab1!Ab1!Ab1!", false},
		{"A!1A!1A!1bBc", false},
	}

	for _, tt := range tests {
		t.Run(tt.password, func(t *testing.T) {
			err := validatePasswordStrength(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePasswordStrength(%q) error = %v, wantErr %v", tt.password, err, tt.wantErr)
			}
		})
	}
}

func TestEdgeCasePasswords(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{"exactly 12 chars valid", "Ab1!Ab1!Ab1!x", false},
		{"exactly 12 chars no special", "Ab1Ab1Ab1Ab1A", true},
		{"all same char", "aaaaaaaaaaaa", true},
		{"all digits", "123456789012", true},
		{"unicode not counted", "Ünïcödé1!Abc", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePasswordStrength(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePasswordStrength(%q) error = %v, wantErr %v", tt.password, err, tt.wantErr)
			}
		})
	}
}
