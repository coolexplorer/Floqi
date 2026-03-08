# Floqi — 로컬 개발 환경 관리
# 사용법:
#   make dev-up     전체 시작 (Supabase + Redis + Next.js)
#   make dev-down   전체 종료
#   make dev-status 상태 확인

.PHONY: dev-up dev-down dev-status dev-reset

# Google OAuth 환경변수 (supabase config.toml에서 참조)
# .env 파일에서 로드하거나, 직접 설정하세요:
#   export GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
#   export GOOGLE_CLIENT_SECRET=your_client_secret
export GOOGLE_CLIENT_ID ?= your_client_id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET ?= your_client_secret

## 전체 로컬 환경 시작
dev-up:
	@echo "🔧 Starting Supabase local..."
	@supabase start || true
	@echo ""
	@echo "🔧 Starting Redis..."
	@docker compose up -d
	@echo ""
	@echo "✅ Local environment ready!"
	@echo "  Supabase API:    http://127.0.0.1:54321"
	@echo "  Supabase Studio: http://127.0.0.1:54323"
	@echo "  Mailpit:         http://127.0.0.1:54324"
	@echo "  Redis:           localhost:6379"
	@echo ""
	@echo "▶ Run 'cd web && npm run dev' to start Next.js"

## 전체 로컬 환경 종료
dev-down:
	@echo "Stopping Redis..."
	@docker compose down
	@echo "Stopping Supabase..."
	@supabase stop || true
	@echo "✅ All services stopped."

## 상태 확인
dev-status:
	@echo "=== Supabase ==="
	@supabase status 2>/dev/null || echo "Supabase not running"
	@echo ""
	@echo "=== Redis ==="
	@docker exec floqi-redis redis-cli ping 2>/dev/null || echo "Redis not running"
	@echo ""
	@echo "=== Containers ==="
	@docker ps --filter "name=floqi" --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

## DB 초기화 (마이그레이션 재적용)
dev-reset:
	@echo "Resetting Supabase database..."
	@supabase db reset
	@echo "✅ Database reset complete."
