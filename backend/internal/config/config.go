package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost        string
	DBPort        string
	DBUser        string
	DBPass        string
	DBName        string
	JWTSecret     string
	JWTExpiry     time.Duration
	RefreshExpiry time.Duration
	UploadDir     string
	AppPort       string
}

var AppConfig *Config

func Load() {
	godotenv.Load()

	jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "15m"))
	refreshExpiry, _ := time.ParseDuration(getEnv("REFRESH_EXPIRY", "168h"))

	AppConfig = &Config{
		DBHost:        getEnv("DB_HOST", "127.0.0.1"),
		DBPort:        getEnv("DB_PORT", "3306"),
		DBUser:        getEnv("DB_USER", "root"),
		DBPass:        getEnv("DB_PASS", ""),
		DBName:        getEnv("DB_NAME", "earsip_db"),
		JWTSecret:     getEnv("JWT_SECRET", "default-secret"),
		JWTExpiry:     jwtExpiry,
		RefreshExpiry: refreshExpiry,
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		AppPort:       getEnv("APP_PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
