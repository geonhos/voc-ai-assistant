.PHONY: help setup up down restart logs logs-backend logs-frontend \
       db-up db-migrate db-seed db-reset \
       ollama-up ollama-pull \
       backend-dev frontend-dev dev \
       test test-backend lint clean

# ─── 기본 ──────────────────────────────────────────────
help: ## 도움말 표시
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── 초기 설정 ─────────────────────────────────────────
setup: ## 최초 환경 설정 (.env 복사 + 의존성 설치)
	@test -f .env || cp .env.example .env && echo "✅ .env 생성 완료 (값을 수정하세요)"
	cd backend && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
	cd frontend && npm install --silent
	@echo "✅ 설정 완료. 'make dev' 또는 'make up' 으로 시작하세요."

# ─── Docker Compose ────────────────────────────────────
up: ## Docker 전체 기동 (DB + Ollama + Backend + Frontend)
	docker compose up -d --build
	@echo "⏳ Ollama 모델 다운로드 (최초 1회)..."
	$(MAKE) ollama-pull
	@echo "✅ http://localhost:3000 (Frontend) | http://localhost:8000/docs (API)"

down: ## Docker 전체 종료
	docker compose down

restart: ## Docker 재시작
	docker compose down && docker compose up -d --build
	$(MAKE) ollama-pull

logs: ## Docker 전체 로그 (follow)
	docker compose logs -f

logs-backend: ## Backend 로그만
	docker compose logs -f backend

logs-frontend: ## Frontend 로그만
	docker compose logs -f frontend

logs-ollama: ## Ollama 로그만
	docker compose logs -f ollama

# ─── Ollama ──────────────────────────────────────────
ollama-up: ## Ollama만 기동
	docker compose up -d ollama
	@echo "✅ Ollama: localhost:11434"

ollama-pull: ## Ollama 모델 다운로드 (qwen2.5:7b + bge-m3)
	docker compose exec ollama ollama pull qwen2.5:7b
	docker compose exec ollama ollama pull bge-m3
	@echo "✅ 모델 다운로드 완료"

# ─── 데이터베이스 ──────────────────────────────────────
db-up: ## PostgreSQL만 기동
	docker compose up -d db
	@echo "✅ PostgreSQL: localhost:5432"

db-migrate: ## Alembic 마이그레이션 실행
	cd backend && .venv/bin/alembic upgrade head

db-seed: ## 시드 데이터 삽입 (관리자 + KB 문서)
	cd backend && .venv/bin/python -m scripts.seed

db-reset: ## DB 초기화 (볼륨 삭제 후 재생성)
	docker compose down -v
	docker compose up -d db
	@echo "⏳ DB 기동 대기..."
	@sleep 3
	$(MAKE) db-migrate db-seed

# ─── 로컬 개발 (Docker 없이) ──────────────────────────
backend-dev: ## Backend 로컬 실행 (uvicorn --reload)
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend-dev: ## Frontend 로컬 실행 (next dev)
	cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev

dev: db-up ollama-up ## DB + Ollama 기동 + Backend & Frontend 동시 실행
	@echo "🚀 Backend: http://localhost:8000 | Frontend: http://localhost:3000"
	@trap 'kill %1 %2 2>/dev/null' EXIT; \
		$(MAKE) backend-dev & \
		$(MAKE) frontend-dev & \
		wait

# ─── 테스트 & 품질 ────────────────────────────────────
test: test-backend ## 전체 테스트 실행

test-backend: ## Backend pytest 실행
	cd backend && .venv/bin/python -m pytest tests/ -v

lint: ## Backend 린트 (ruff)
	cd backend && .venv/bin/ruff check app/ tests/

# ─── 정리 ─────────────────────────────────────────────
clean: ## 빌드 산출물 정리
	rm -rf backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/.next frontend/out
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ 정리 완료"
