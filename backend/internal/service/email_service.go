package service

import (
	"crypto/tls"
	"fmt"
	"gorm.io/gorm/clause"
	"net"
	"net/smtp"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/fursuit-platform/backend/internal/config"
	"github.com/fursuit-platform/backend/internal/model"
)

type EmailService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewEmailService(db *gorm.DB, cfg *config.Config) *EmailService {
	return &EmailService{db: db, cfg: cfg}
}

func (s *EmailService) QueueEmail(to, subject, body string) error {
	email := model.EmailOutbox{
		To:         to,
		Subject:    subject,
		Body:       body,
		Status:     "pending",
		MaxRetries: 3,
	}
	return s.db.Create(&email).Error
}

// Deliveries are at-least-once. A stable Message-ID lets recipients deduplicate
// if SMTP accepts a message immediately before the transaction loses its connection.
func (s *EmailService) ProcessOutbox() error {
	for i := 0; i < 50; i++ {
		found := false
		err := s.db.Transaction(func(tx *gorm.DB) error {
			var email model.EmailOutbox
			err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).Where("status = ? AND retries < max_retries", "pending").Order("id ASC").First(&email).Error
			if err == gorm.ErrRecordNotFound {
				return nil
			}
			if err != nil {
				return err
			}
			found = true
			if err := s.sendEmail(&email); err != nil {
				status := "pending"
				if email.Retries+1 >= email.MaxRetries {
					status = "failed"
				}
				return tx.Model(&email).Updates(map[string]interface{}{"retries": email.Retries + 1, "last_error": err.Error(), "status": status}).Error
			}
			return tx.Model(&email).Updates(map[string]interface{}{"status": "sent", "sent_at": time.Now().UTC(), "last_error": ""}).Error
		})
		if err != nil {
			return err
		}
		if !found {
			return nil
		}
	}
	return nil
}
func (s *EmailService) sendEmail(email *model.EmailOutbox) error {
	for _, value := range []string{email.To, email.Subject, s.cfg.SMTPFrom} {
		if strings.ContainsAny(value, "\r\n") {
			return fmt.Errorf("invalid mail header")
		}
	}
	address := net.JoinHostPort(s.cfg.SMTPHost, s.cfg.SMTPPort)
	conn, err := net.DialTimeout("tcp", address, 5*time.Second)
	if err != nil {
		return err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(10 * time.Second))
	client, err := smtp.NewClient(conn, s.cfg.SMTPHost)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: s.cfg.SMTPHost, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}
	if s.cfg.SMTPUser != "" {
		if err := client.Auth(smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)); err != nil {
			return err
		}
	}
	if err := client.Mail(s.cfg.SMTPFrom); err != nil {
		return err
	}
	if err := client.Rcpt(email.To); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMessage-ID: <outbox-%d@fursuit.local>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s", s.cfg.SMTPFrom, email.To, email.Subject, email.ID, email.Body)
	if _, err := writer.Write([]byte(message)); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func (s *EmailService) SendVerificationEmail(to, token string) error {
	verificationURL := s.cfg.FrontendURL + "/verify-email?token=" + token
	subject := "Verify your email address"
	body := fmt.Sprintf(`<p>Thanks for registering!</p>
<p>Please verify your email by clicking the link below:</p>
<p><a href="%s">Verify Email</a></p>
<p>This link will expire in 24 hours.</p>`, verificationURL)

	return s.QueueEmail(to, subject, body)
}

func (s *EmailService) SendPasswordResetEmail(to, token string) error {
	resetURL := s.cfg.FrontendURL + "/reset-password?token=" + token
	subject := "Reset your password"
	body := fmt.Sprintf(`<p>You requested a password reset.</p>
<p>Click the link below to reset your password:</p>
<p><a href="%s">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you did not request this, you can safely ignore this email.</p>`, resetURL)

	return s.QueueEmail(to, subject, body)
}
