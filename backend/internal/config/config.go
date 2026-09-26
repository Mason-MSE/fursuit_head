package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	ServerPort  string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	RedisAddr   string
	JWTSecret   string
	FrontendURL string

	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	MaxLoginAttempts int
	LockoutDuration  time.Duration
	RateLimitWindow  time.Duration
	RateLimitMax     int
	SMTPHost         string
	SMTPPort         string
	SMTPUser         string
	SMTPPassword     string
	SMTPFrom         string
	FileUploadPath   string
	MaxFileSizeMB    int
}

func Load() *Config {
	return &Config{
		ServerPort:  getEnv("SERVER_PORT", "8080"),
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "3307"),
		DBUser:      getEnv("DB_USER", "root"),
		DBPassword:  getEnv("DB_PASSWORD", "password"),
		DBName:      getEnv("DB_NAME", "fursuit_platform"),
		RedisAddr:   getEnv("REDIS_ADDR", "localhost:6380"),
		JWTSecret:   getEnv("JWT_SECRET", "fursuit-dev-secret-key-change-in-prod"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		AccessTokenTTL:   getEnvDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:  getEnvDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
		MaxLoginAttempts: getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
		LockoutDuration:  getEnvDuration("LOCKOUT_DURATION", 15*time.Minute),
		RateLimitWindow:  getEnvDuration("RATE_LIMIT_WINDOW", 1*time.Minute),
		RateLimitMax:     getEnvInt("RATE_LIMIT_MAX", 30),
		SMTPHost:         getEnv("SMTP_HOST", "localhost"),
		SMTPPort:         getEnv("SMTP_PORT", "1025"),
		SMTPUser:         getEnv("SMTP_USER", ""),
		SMTPPassword:     getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:         getEnv("SMTP_FROM", "noreply@fursuit.local"),
		FileUploadPath:   getEnv("FILE_UPLOAD_PATH", "./uploads"),
		MaxFileSizeMB:    getEnvInt("MAX_FILE_SIZE_MB", 20),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}
