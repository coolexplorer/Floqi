# ============================================================
# Multi-stage build for Floqi Go Worker
# ============================================================

# Stage 1: Builder
FROM golang:1.23-alpine AS builder
# Note: Dockerfile uses 1.23 for production builds (Fly.io will pull this image)

WORKDIR /app

# Download dependencies first (layer cache optimization)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /floqi-worker ./cmd/worker

# ============================================================
# Stage 2: Runtime (minimal alpine image)
# ============================================================
FROM alpine:3.20

# ca-certificates: needed for HTTPS calls to external APIs
# tzdata: needed for timezone-aware scheduling
RUN apk --no-cache add ca-certificates tzdata

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /floqi-worker /floqi-worker

USER appuser

ENTRYPOINT ["/floqi-worker"]
