package handler

import (
	"github.com/fursuit-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type PrivateFileHandler struct {
	Service  *service.PrivateFileService
	MaxBytes int64
}

func (h *PrivateFileHandler) Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.MaxBytes+1024*1024)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": gin.H{"message": "Choose a file within the size limit"}})
		return
	}
	src, err := file.Open()
	if err != nil {
		c.AbortWithStatus(400)
		return
	}
	defer src.Close()
	record, err := h.Service.Save(c.GetUint64("user_id"), file.Filename, src)
	if err != nil {
		c.JSON(400, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	url, _ := h.Service.SignedURL(record.ID, record.UserID)
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": record.ID, "filename": record.Name, "url": url, "size": record.Size, "sha256": record.SHA256}})
}
func (h *PrivateFileHandler) Link(c *gin.Context) {
	url, err := h.Service.SignedURL(c.Param("id"), c.GetUint64("user_id"))
	if err != nil {
		c.AbortWithStatus(404)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"url": url}})
}
func (h *PrivateFileHandler) Download(c *gin.Context) {
	file, err := h.Service.Download(c.Param("id"), c.Query("expires"), c.Query("signature"))
	if err != nil {
		c.AbortWithStatus(404)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Header("Content-Type", file.MIME)
	c.FileAttachment(file.Path, file.Name)
}
