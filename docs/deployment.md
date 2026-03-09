# Floqi Worker — Fly.io Deployment Secrets

All secrets have been removed from `worker/fly.toml` and must be set via `fly secrets set` before deployment.

## Required Secrets

```bash
# Database (Supabase PostgreSQL)
fly secrets set DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

# Redis (Upstash)
fly secrets set REDIS_ADDR="HOST.upstash.io:6379"
fly secrets set REDIS_PASSWORD="your_redis_password"

# Token Encryption (generate with: openssl rand -hex 32)
fly secrets set TOKEN_ENCRYPTION_KEY="your_64_hex_character_key"

# LLM — Anthropic Claude
fly secrets set ANTHROPIC_API_KEY="sk-ant-your_api_key"

# Google OAuth
fly secrets set GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
fly secrets set GOOGLE_CLIENT_SECRET="your_client_secret"

# External APIs
fly secrets set NEWS_API_KEY="your_news_api_key"
fly secrets set OPENWEATHERMAP_API_KEY="your_openweathermap_key"
```

## Setting All Secrets at Once

```bash
fly secrets set \
  DATABASE_URL="..." \
  REDIS_ADDR="..." \
  REDIS_PASSWORD="..." \
  TOKEN_ENCRYPTION_KEY="..." \
  ANTHROPIC_API_KEY="..." \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  NEWS_API_KEY="..." \
  OPENWEATHERMAP_API_KEY="..."
```

## Verifying Secrets

```bash
# List all set secrets (values are hidden)
fly secrets list
```

## Non-Secret Config

The following non-secret values remain in `fly.toml` under `[env]`:

- `LOG_LEVEL = "info"`
- `ENVIRONMENT = "production"`
