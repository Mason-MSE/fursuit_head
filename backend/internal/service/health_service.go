package service

import (
	"context"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthService struct {
	db  *gorm.DB
	rdb *goredis.Client
}

func NewHealthService(db *gorm.DB, rdb *goredis.Client) *HealthService {
	return &HealthService{db: db, rdb: rdb}
}

type HealthStatus struct {
	Status string            `json:"status"`
	Time   string            `json:"time"`
	Checks map[string]string `json:"checks"`
}

func (s *HealthService) Liveness() *HealthStatus {
	return &HealthStatus{
		Status: "ok",
		Time:   time.Now().UTC().Format(time.RFC3339),
		Checks: map[string]string{},
	}
}

func (s *HealthService) Readiness() *HealthStatus {
	checks := map[string]string{}
	status := "ok"

	// Check DB
	sqlDB, err := s.db.DB()
	if err != nil {
		checks["database"] = "error: " + err.Error()
		status = "degraded"
	} else {
		if err := sqlDB.PingContext(context.Background()); err != nil {
			checks["database"] = "error: " + err.Error()
			status = "degraded"
		} else {
			checks["database"] = "ok"
		}
	}

	// Check Redis
	if s.rdb != nil {
		if err := s.rdb.Ping(context.Background()).Err(); err != nil {
			checks["redis"] = "error: " + err.Error()
			status = "degraded"
		} else {
			checks["redis"] = "ok"
		}
	} else {
		checks["redis"] = "not configured"
	}

	return &HealthStatus{
		Status: status,
		Time:   time.Now().UTC().Format(time.RFC3339),
		Checks: checks,
	}
}
