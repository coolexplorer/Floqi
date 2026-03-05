package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"floqi/worker/internal/config"
	"floqi/worker/internal/db"
)

func main() {
	// Configure structured logging with human-readable console output
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("Worker starting...")

	// Load configuration from environment variables
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	// Initialize database connection pool
	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	log.Info().Msg("Database connection pool initialized")
	log.Info().Str("redis_addr", cfg.RedisAddr).Msg("Worker started")

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutdown signal received, exiting...")
}
