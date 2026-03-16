# VOC AI Assistant

AI-powered Voice of Customer support assistant that handles customer inquiries through a RAG pipeline, with automatic escalation to human agents when confidence is low.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL + pgvector, Alembic
- **AI/RAG**: OpenAI GPT-4o-mini, text-embedding-3-small, LangChain
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Auth**: JWT (access + refresh tokens), bcrypt
- **Infra**: Docker Compose, pgvector/pgvector:pg16

## Quick Start

### Option A: Docker Compose (recommended)

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd voc-ai-assistant
   ```

2. Copy and fill in environment variables:
   ```bash
   cp .env.example .env
   # Edit .env — set OPENAI_API_KEY and JWT_SECRET_KEY at minimum
   ```

3. Start all services:
   ```bash
   docker-compose up -d
   ```

4. Run database migrations and seed data:
   ```bash
   docker-compose exec backend alembic upgrade head
   docker-compose exec backend python -m scripts.seed
   ```

5. Access:
   - Frontend: http://localhost:3000
   - API docs (Swagger): http://localhost:8000/docs
   - API docs (ReDoc): http://localhost:8000/redoc

### Option B: Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # then edit .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run dev
```

## Project Structure

```
voc-ai-assistant/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Route handlers (auth, chat, admin, knowledge)
│   │   ├── core/          # Config, DB engine, security utilities
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # Business logic and RAG pipeline
│   ├── alembic/           # Database migrations
│   ├── scripts/           # Seed and utility scripts
│   └── tests/
├── frontend/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Reusable UI components
│   ├── hooks/             # ViewModel hooks (MVVM pattern)
│   └── lib/               # API client and utilities
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Obtain access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/chat/conversations` | Start a new customer conversation |
| POST | `/chat/conversations/{id}/messages` | Send a message (triggers RAG) |
| GET | `/chat/conversations/{id}/messages` | Retrieve conversation history |
| GET | `/admin/conversations` | List all conversations (admin) |
| GET | `/admin/conversations/{id}` | Get conversation detail (admin) |
| PATCH | `/admin/conversations/{id}/status` | Update conversation status |
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| POST | `/admin/conversations/{id}/messages` | Send admin reply |
| POST | `/knowledge/` | Create knowledge article |
| GET | `/knowledge/` | List knowledge articles |
| GET | `/knowledge/{id}` | Get knowledge article |
| PATCH | `/knowledge/{id}` | Update knowledge article |
| DELETE | `/knowledge/{id}` | Delete knowledge article |
| GET | `/health` | Health check |

## Default Credentials (after seed)

- Email: `admin@voc.ai`
- Password: `admin123`

Change these immediately in production.
