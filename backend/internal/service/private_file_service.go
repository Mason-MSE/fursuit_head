package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/fursuit-platform/backend/internal/config"
	"github.com/fursuit-platform/backend/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type StoredFile struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    uint64    `gorm:"index" json:"user_id"`
	Name      string    `json:"name"`
	Path      string    `json:"-"`
	MIME      string    `json:"mime"`
	SHA256    string    `json:"sha256"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}
type PrivateFileService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewPrivateFileService(db *gorm.DB, cfg *config.Config) *PrivateFileService {
	return &PrivateFileService{db: db, cfg: cfg}
}
func (s *PrivateFileService) Save(userID uint64, name string, reader io.Reader) (*StoredFile, error) {
	limit := int64(s.cfg.MaxFileSizeMB) * 1024 * 1024
	if limit <= 0 {
		limit = 20 * 1024 * 1024
	}
	data, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || int64(len(data)) > limit {
		return nil, fmt.Errorf("file is empty or exceeds upload limit")
	}
	ext := strings.ToLower(filepath.Ext(name))
	mime := http.DetectContentType(data)
	types := map[string]string{".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf"}
	if types[ext] == "" || types[ext] != mime {
		return nil, fmt.Errorf("file content does not match an allowed JPG, PNG, WebP or PDF type")
	}
	id := uuid.NewString()
	digest := sha256.Sum256(data)
	// Private files are deliberately outside the static public uploads directory.
	dir := s.cfg.FileUploadPath + "-private"
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	path := filepath.Join(dir, id+ext)
	if err := os.WriteFile(path, data, 0600); err != nil {
		return nil, err
	}
	file := &StoredFile{ID: id, UserID: userID, Name: filepath.Base(name), Path: path, MIME: mime, SHA256: hex.EncodeToString(digest[:]), Size: int64(len(data))}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var owner model.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&owner, userID).Error; err != nil {
			return err
		}
		var total int64
		if err := tx.Model(&StoredFile{}).Where("user_id = ?", userID).Select("COALESCE(SUM(size),0)").Scan(&total).Error; err != nil {
			return err
		}
		if total+file.Size > 100*1024*1024 {
			return fmt.Errorf("total file allowance of 100MB exceeded")
		}
		return tx.Create(file).Error
	})
	if err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	return file, nil
}
func (s *PrivateFileService) signature(id string, expires int64) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	fmt.Fprintf(mac, "file:%s:%d", id, expires)
	return hex.EncodeToString(mac.Sum(nil))
}
func (s *PrivateFileService) SignedURL(id string, userID uint64) (string, error) {
	var file StoredFile
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&file).Error; err != nil {
		return "", fmt.Errorf("file not found")
	}
	expires := time.Now().Add(5 * time.Minute).Unix()
	return fmt.Sprintf("/api/v1/files/%s/download?expires=%d&signature=%s", id, expires, s.signature(id, expires)), nil
}
func (s *PrivateFileService) Download(id, expiry, signature string) (*StoredFile, error) {
	expires, err := strconv.ParseInt(expiry, 10, 64)
	if err != nil || expires < time.Now().Unix() || expires > time.Now().Add(5*time.Minute).Unix() {
		return nil, fmt.Errorf("expired link")
	}
	expected, err := hex.DecodeString(s.signature(id, expires))
	if err != nil {
		return nil, err
	}
	actual, err := hex.DecodeString(signature)
	if err != nil || !hmac.Equal(actual, expected) {
		return nil, fmt.Errorf("invalid link")
	}
	var file StoredFile
	if err := s.db.First(&file, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &file, nil
}
