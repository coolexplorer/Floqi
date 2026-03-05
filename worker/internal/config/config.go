package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment variable configuration for the worker.
type Config struct {
	DatabaseURL        string
	RedisAddr          string
	RedisPassword      string
	TokenEncryptionKey string
	GoogleClientID     string
	GoogleClientSecret string
	AnthropicAPIKey    string
	NewsAPIKey         string
	WeatherAPIKey      string
}

// LoadConfig loads configuration from environment variables.
// Optionally loads from .env file if present.
// Returns an error if any required fields are missing.
func LoadConfig() (*Config, error) {
	// Load .env if present (ignore error if file not found)
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		RedisAddr:          os.Getenv("REDIS_ADDR"),
		RedisPassword:      os.Getenv("REDIS_PASSWORD"),
		TokenEncryptionKey: os.Getenv("TOKEN_ENCRYPTION_KEY"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		AnthropicAPIKey:    os.Getenv("ANTHROPIC_API_KEY"),
		NewsAPIKey:         os.Getenv("NEWS_API_KEY"),
		WeatherAPIKey:      os.Getenv("OPENWEATHERMAP_API_KEY"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// validate checks that all required fields are set.
func (c *Config) validate() error {
	required := map[string]string{
		"DATABASE_URL":         c.DatabaseURL,
		"REDIS_ADDR":           c.RedisAddr,
		"TOKEN_ENCRYPTION_KEY": c.TokenEncryptionKey,
	}

	for name, val := range required {
		if val == "" {
			return fmt.Errorf("required environment variable %s is not set", name)
		}
	}

	return nil
}
