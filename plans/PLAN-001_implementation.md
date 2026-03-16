# PLAN-001: VOC AI Assistant Implementation Plan

**Status**: Draft → **Revised (Python/FastAPI)**
**Created**: 2026-03-13
**Total Tasks**: 42
**Estimated Duration**: 28-32 hours (sequential) | 16-20 hours (with parallelization)
**Execution Model**: 5 phases with 2-3 parallel streams

---

## Executive Summary

Complete implementation of the VOC AI Assistant — a Stripe-like customer support chatbot with Knowledge Base RAG, AI escalation, and admin dashboard.

**Tech Stack:**
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + pgvector
- **AI/RAG**: LangChain + OpenAI GPT-4 + text-embedding-3-small
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL 16 + pgvector
- **Infra**: Docker Compose

**Key Design Decisions:**
- Backend + AI를 **단일 FastAPI 서비스**로 통합 (서비스 간 통신 제거)
- LangChain 네이티브 RAG 파이프라인 (직접 구현 최소화)
- Pydantic v2 기반 스키마 검증
- Alembic으로 DB 마이그레이션
- MVVM 패턴으로 프론트엔드 구성

---

## Phase Overview

| Phase | Focus | Tasks | Duration | Dependencies |
|-------|-------|-------|----------|--------------|
| **Phase 0** | Infrastructure & Setup | 6 | 3h | None |
| **Phase 1** | Backend Core (Models, API, Auth) | 10 | 6h | Phase 0 |
| **Phase 2** | AI & RAG Integration | 8 | 5h | Phase 1 |
| **Phase 3** | Frontend Implementation | 8 | 6h | Phase 1 API 완료 |
| **Phase 4** | Integration & Testing | 10 | 4h | Phase 2, 3 완료 |

---

## PHASE 0: Infrastructure & Setup (6 Tasks)

**Owner**: ai-expert
**Duration**: 3h
**Deliverables**: Docker 환경, FastAPI/Next.js 프로젝트 스캐폴딩

### T0.1: FastAPI 프로젝트 구조 생성
**Description**:
Python 3.12 + FastAPI 프로젝트를 아래 구조로 생성:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (env vars)
│   │   ├── database.py      # SQLAlchemy async engine + session
│   │   ├── security.py      # JWT 생성/검증, password hashing
│   │   └── deps.py          # FastAPI dependencies (get_db, get_current_user)
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response DTOs
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py      # POST /auth/login, /auth/refresh
│   │   │   ├── chat.py      # Customer chat endpoints
│   │   │   ├── admin.py     # Admin conversation management
│   │   │   └── knowledge.py # Knowledge Base CRUD
│   │   └── deps.py
│   └── services/
│       ├── conversation.py   # 대화 비즈니스 로직
│       ├── ai_response.py    # AI 응답 생성 + RAG
│       ├── knowledge.py      # KB CRUD + 임베딩
│       ├── escalation.py     # 에스컬레이션 판단 + Slack
│       └── notification.py   # Slack/Email 알림
├── alembic/                  # DB migrations
├── tests/
├── requirements.txt
├── alembic.ini
└── Dockerfile
```

**Acceptance Criteria**:
- ✅ `pip install -r requirements.txt` 성공
- ✅ `uvicorn app.main:app --reload` 로 서버 기동
- ✅ `/docs` (Swagger UI) 접근 가능
- ✅ `.env.example` 에 모든 환경변수 문서화

**Dependencies**: requirements.txt
```
fastapi>=0.110
uvicorn[standard]>=0.27
sqlalchemy[asyncio]>=2.0
asyncpg>=0.29
alembic>=1.13
pgvector>=0.3
pydantic>=2.6
pydantic-settings>=2.1
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
langchain>=0.1
langchain-openai>=0.0.8
openai>=1.12
httpx>=0.27
python-multipart>=0.0.9
```

**Assigned To**: ai-expert
**Blocks**: All backend tasks

---

### T0.2: Next.js Frontend 프로젝트 생성
**Description**:
Next.js 14+ App Router + TypeScript + Tailwind CSS 초기화:

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── chat/page.tsx         # 고객 채팅
│   ├── login/page.tsx        # 관리자 로그인
│   ├── (admin)/
│   │   ├── layout.tsx        # 사이드바 레이아웃
│   │   ├── dashboard/page.tsx
│   │   ├── conversations/
│   │   │   ├── page.tsx      # 목록
│   │   │   └── [id]/page.tsx # 상세
│   │   └── knowledge/page.tsx
├── components/               # 공통 UI 컴포넌트
├── hooks/                    # MVVM ViewModel hooks
├── lib/
│   ├── api-client.ts         # fetch wrapper + auth header
│   └── design-tokens.ts      # UX spec 디자인 토큰
├── package.json
├── tailwind.config.ts        # 디자인 토큰 통합
└── next.config.js
```

**Acceptance Criteria**:
- ✅ `npm run dev` → localhost:3000
- ✅ `npm run build` 성공
- ✅ 디자인 토큰 (colors, typography, spacing) Tailwind config에 반영
- ✅ lib/api-client.ts 에 base URL + auth interceptor 설정

**Assigned To**: frontend-dev
**Blocks**: All frontend tasks

---

### T0.3: Docker Compose (PostgreSQL + pgvector)
**Description**:
개발 환경용 Docker Compose 설정:
- PostgreSQL 16 + pgvector
- Volume persistence
- Health check
- .env.example

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: voc_ai
      POSTGRES_USER: voc
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U voc"]
```

**Acceptance Criteria**:
- ✅ `docker-compose up -d` 로 DB 기동
- ✅ pgvector extension 사용 가능
- ✅ .env.example 제공

**Assigned To**: ai-expert

---

### T0.4: SQLAlchemy 모델 & Alembic 마이그레이션 기반
**Description**:
SQLAlchemy 2.0 async 기반 DB 설정:
- async engine + sessionmaker
- Base model (id, created_at, updated_at 공통)
- Alembic 초기화 (`alembic init`)
- env.py에 async 설정

**Acceptance Criteria**:
- ✅ `alembic revision --autogenerate` 작동
- ✅ `alembic upgrade head` 작동
- ✅ async session dependency (get_db) 정의

**Assigned To**: ai-expert

---

### T0.5: JWT 인증 시스템
**Description**:
FastAPI 기반 JWT 인증:
- `POST /api/v1/auth/login` → access_token + refresh_token
- `POST /api/v1/auth/refresh` → new access_token
- password hashing (bcrypt via passlib)
- FastAPI Depends(get_current_user) 디펜던시
- role 기반 접근 제어 (ADMIN, CUSTOMER)

**Acceptance Criteria**:
- ✅ 로그인 → JWT 발급
- ✅ Protected 엔드포인트에서 토큰 검증
- ✅ Role 체크 (admin only endpoints)
- ✅ 단위 테스트 (토큰 생성/검증)

**Assigned To**: ai-expert

---

### T0.6: 프론트엔드 인증 컨텍스트 & 라우트 보호
**Description**:
Next.js 인증 레이어:
- AuthContext (JWT 토큰 관리, localStorage)
- useAuthViewModel (로그인/로그아웃/토큰 갱신)
- Protected routes wrapper (admin 라우트)
- API client에 Authorization header 자동 추가

**Acceptance Criteria**:
- ✅ /login → 인증 시 /dashboard 리다이렉트
- ✅ /dashboard → 미인증 시 /login 리다이렉트
- ✅ API client에 토큰 자동 첨부
- ✅ 로그아웃 시 토큰 삭제

**Assigned To**: frontend-dev

---

## PHASE 1: Backend Core — Models, API, Services (10 Tasks)

**Owner**: ai-expert
**Duration**: 6h
**Depends On**: Phase 0
**Deliverables**: 전체 REST API + DB 모델 + 비즈니스 로직

### T1.1: SQLAlchemy 모델 정의
**Description**:
핵심 도메인 모델 생성:

```python
# models/user.py
class User(Base):
    id, email, password_hash, role(ADMIN/CUSTOMER), created_at, updated_at

# models/conversation.py
class Conversation(Base):
    id, customer_name, customer_email, status(OPEN/ESCALATED/RESOLVED),
    topic, created_at, updated_at, resolved_at, resolved_by

# models/message.py
class Message(Base):
    id, conversation_id(FK), sender(AI/CUSTOMER/ADMIN/SYSTEM),
    text, confidence, created_at

# models/escalation.py
class EscalationEvent(Base):
    id, conversation_id(FK), reason, triggered_at, resolved_at, resolved_by

# models/knowledge.py
class KnowledgeArticle(Base):
    id, title, category, content, tags(ARRAY),
    embedding(Vector(1536)), active, created_by, created_at, updated_at
```

**Acceptance Criteria**:
- ✅ 모든 모델 정의 완료
- ✅ pgvector Vector(1536) 타입 사용
- ✅ Foreign key 관계 설정 (relationship)
- ✅ Alembic 마이그레이션 생성 및 적용
- ✅ 인덱스 (conversation_id on messages, status on conversations, active on articles)

**Assigned To**: ai-expert

---

### T1.2: Pydantic 스키마 (Request/Response)
**Description**:
API 통신용 Pydantic v2 스키마:

```python
# schemas/conversation.py
class ConversationCreate(BaseModel):
    customer_name: str = Field(min_length=2)
    customer_email: EmailStr
    topic: str = Field(min_length=5)

class ConversationResponse(BaseModel):
    id: int
    customer_name: str
    status: ConversationStatus
    message_count: int
    created_at: datetime

# schemas/message.py
class MessageCreate(BaseModel):
    text: str = Field(min_length=1)

class MessageResponse(BaseModel):
    id: int
    sender: SenderType
    text: str
    confidence: float | None
    created_at: datetime

# schemas/knowledge.py
class KnowledgeArticleCreate(BaseModel):
    title: str = Field(min_length=5)
    category: str
    content: str = Field(min_length=20)
    tags: list[str] = []

class KnowledgeArticleResponse(BaseModel):
    id: int
    title: str
    category: str
    tags: list[str]
    active: bool
    updated_at: datetime
```

**Acceptance Criteria**:
- ✅ 모든 Request/Response 스키마 정의
- ✅ Pydantic v2 model_config = ConfigDict(from_attributes=True)
- ✅ Validation 규칙 (min_length, EmailStr 등)
- ✅ Enum 타입 (ConversationStatus, SenderType)

**Assigned To**: ai-expert

---

### T1.3: 고객 채팅 API
**Description**:
고객 대면 채팅 엔드포인트 (인증 불필요):

```python
# api/v1/chat.py
POST /api/v1/chat/conversations          → 대화 생성
GET  /api/v1/chat/conversations/{id}     → 대화 조회
POST /api/v1/chat/conversations/{id}/messages → 메시지 전송
GET  /api/v1/chat/conversations/{id}/messages → 메시지 목록
```

- 고객 메시지 전송 시 AI 응답 자동 생성 (BackgroundTasks)
- AI 응답은 비동기로 생성 후 DB 저장

**Acceptance Criteria**:
- ✅ 4개 엔드포인트 구현
- ✅ 입력 검증 (Pydantic)
- ✅ 대화 미존재 시 404
- ✅ AI 응답 비동기 트리거 (BackgroundTasks)
- ✅ Swagger 문서 자동 생성

**Assigned To**: ai-expert

---

### T1.4: 관리자 대화 관리 API
**Description**:
관리자 전용 엔드포인트 (JWT 인증 필수):

```python
# api/v1/admin.py
GET  /api/v1/admin/conversations              → 대화 목록 (필터/페이징)
GET  /api/v1/admin/conversations/{id}         → 대화 상세 (메시지 포함)
POST /api/v1/admin/conversations/{id}/messages → 관리자 메시지 전송
POST /api/v1/admin/conversations/{id}/resolve  → 대화 해결 처리
```

- 필터: status, period(today/week/month), search
- 페이지네이션: page, size, total 포함

**Acceptance Criteria**:
- ✅ JWT 인증 + ADMIN role 검증
- ✅ 필터/검색/페이지네이션 동작
- ✅ 해결 처리 시 status=RESOLVED, resolved_at 설정
- ✅ 403/404 에러 처리

**Assigned To**: ai-expert

---

### T1.5: Knowledge Base CRUD API
**Description**:
KB 관리 엔드포인트 (JWT 인증 필수):

```python
# api/v1/knowledge.py
POST   /api/v1/admin/knowledge        → 문서 생성 (임베딩 자동 생성)
GET    /api/v1/admin/knowledge        → 문서 목록
GET    /api/v1/admin/knowledge/{id}   → 문서 상세
PUT    /api/v1/admin/knowledge/{id}   → 문서 수정 (임베딩 재생성)
DELETE /api/v1/admin/knowledge/{id}   → 문서 비활성화 (soft delete)
```

- 생성/수정 시 임베딩 자동 생성 (BackgroundTasks)
- 삭제는 soft delete (active=false)

**Acceptance Criteria**:
- ✅ CRUD 전체 구현
- ✅ 생성/수정 시 임베딩 트리거
- ✅ Soft delete
- ✅ 태그 필터링

**Assigned To**: ai-expert

---

### T1.6: 대시보드 통계 API
**Description**:
대시보드 KPI 및 차트 데이터 엔드포인트:

```python
# api/v1/admin.py (추가)
GET /api/v1/admin/dashboard/stats     → KPI 카드 데이터
GET /api/v1/admin/dashboard/trends    → 일별 추세 데이터
GET /api/v1/admin/dashboard/categories → 카테고리별 분포
```

- stats: 총 대화수, AI 해결률, 평균 응답시간, 에스컬레이션 수
- trends: 최근 7일/30일 일별 대화수 + 에스컬레이션 수
- categories: 카테고리별 대화 비율

**Acceptance Criteria**:
- ✅ 3개 통계 엔드포인트
- ✅ SQL 집계 쿼리 (COUNT, AVG, GROUP BY)
- ✅ 기간 필터 (7d/30d)

**Assigned To**: ai-expert

---

### T1.7: ConversationService (비즈니스 로직)
**Description**:
대화 관리 핵심 서비스:

```python
class ConversationService:
    async def create_conversation(customer_name, email, topic) → Conversation
    async def add_message(conversation_id, sender, text, confidence) → Message
    async def escalate(conversation_id, reason) → EscalationEvent
    async def resolve(conversation_id, admin_id, note) → Conversation
    async def list_conversations(filters, page, size) → Page[Conversation]
    async def get_detail(conversation_id) → ConversationDetail
```

**Acceptance Criteria**:
- ✅ 상태 전이 검증 (OPEN→ESCALATED→RESOLVED)
- ✅ 에스컬레이션 시 Slack 알림 트리거
- ✅ 해결 시 메타데이터 저장
- ✅ 단위 테스트

**Assigned To**: ai-expert

---

### T1.8: KnowledgeService (CRUD + 임베딩)
**Description**:
KB 서비스:

```python
class KnowledgeService:
    async def create_article(data) → KnowledgeArticle  # + 임베딩 생성
    async def update_article(id, data) → KnowledgeArticle  # + 임베딩 재생성
    async def delete_article(id) → None  # soft delete
    async def list_articles(category, search) → list[KnowledgeArticle]
    async def search_similar(query_embedding, top_k) → list[KnowledgeArticle]
```

**Acceptance Criteria**:
- ✅ CRUD 동작
- ✅ 임베딩 생성/갱신 연동
- ✅ pgvector 유사도 검색 (<-> 연산자)
- ✅ 단위 테스트

**Assigned To**: ai-expert

---

### T1.9: Slack 에스컬레이션 알림
**Description**:
에스컬레이션 시 Slack 알림 전송:
- Slack Incoming Webhook 사용
- Block Kit 포맷 (고객명, 주제, 대화 요약, 링크)
- httpx로 비동기 전송
- 실패 시 로깅 (서비스 중단 없음)

**Acceptance Criteria**:
- ✅ Slack Block Kit 메시지 포맷
- ✅ 비동기 전송 (httpx.AsyncClient)
- ✅ 에러 시 graceful degradation
- ✅ 환경변수로 webhook URL 관리

**Assigned To**: ai-expert

---

### T1.10: 글로벌 에러 핸들러 & CORS
**Description**:
FastAPI 전역 설정:

```python
# Exception handlers
@app.exception_handler(NotFoundError) → 404
@app.exception_handler(UnauthorizedError) → 401
@app.exception_handler(ForbiddenError) → 403
@app.exception_handler(ValidationError) → 422
@app.exception_handler(Exception) → 500

# CORS
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured logging
logging.config with JSON format
```

**Acceptance Criteria**:
- ✅ 일관된 에러 응답 포맷 `{detail, code, timestamp}`
- ✅ CORS 설정 (프론트엔드 허용)
- ✅ 구조화 로깅
- ✅ Request/Response 로깅 미들웨어

**Assigned To**: ai-expert

---

## PHASE 2: AI & RAG Integration (8 Tasks)

**Owner**: ai-expert
**Duration**: 5h
**Depends On**: Phase 1
**Parallel With**: Phase 3 (프론트엔드)와 병렬 가능
**Deliverables**: RAG 파이프라인, AI 응답 생성, 에스컬레이션 감지

### T2.1: 임베딩 생성 서비스
**Description**:
OpenAI text-embedding-3-small 기반 임베딩:

```python
class EmbeddingService:
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        self.model = "text-embedding-3-small"

    async def generate_embedding(text: str) → list[float]  # 1536-dim
    async def batch_embeddings(texts: list[str]) → list[list[float]]
```

- KB 문서 생성/수정 시 호출
- Rate limiting 고려 (배치 처리)

**Acceptance Criteria**:
- ✅ 단일/배치 임베딩 생성
- ✅ pgvector 저장 연동
- ✅ 에러 핸들링 + 재시도
- ✅ 단위 테스트 (mock OpenAI)

**Assigned To**: ai-expert

---

### T2.2: RAG 검색 파이프라인
**Description**:
LangChain 기반 RAG 구현:

```python
class RagService:
    async def retrieve_context(query: str, top_k: int = 3) → list[KnowledgeArticle]:
        # 1. query → embedding 변환
        # 2. pgvector 유사도 검색 (cosine distance)
        # 3. 결과 필터링 (active=true, similarity > threshold)
        # 4. 컨텍스트 포맷팅

    def format_context(articles: list[KnowledgeArticle]) → str:
        # KB 문서를 프롬프트 컨텍스트로 변환
```

- pgvector `<->` 연산자로 코사인 유사도 검색
- `1 - distance`로 유사도 점수 변환

**Acceptance Criteria**:
- ✅ 유사도 검색 동작 (top-k)
- ✅ 임계값 필터링 (similarity > 0.3)
- ✅ 컨텍스트 포맷팅
- ✅ 결과 없을 때 graceful handling
- ✅ 단위 테스트

**Assigned To**: ai-expert

---

### T2.3: 시스템 프롬프트 & 프롬프트 엔지니어링
**Description**:
AI 챗봇 프롬프트 설계:

```python
SYSTEM_PROMPT = """
당신은 고객 지원 AI 어시스턴트입니다.

역할:
- 고객의 문의를 친절하고 정확하게 답변합니다
- Knowledge Base의 정보를 기반으로 답변합니다
- 확실하지 않은 내용은 솔직히 모른다고 합니다

참고 자료:
{context}

대화 기록:
{history}

규칙:
- 한국어로 답변합니다
- 간결하되 충분한 정보를 제공합니다
- 해결이 어려우면 전문 상담사 연결을 안내합니다
- 답변의 확신도를 0.0~1.0으로 평가합니다
"""
```

**Acceptance Criteria**:
- ✅ 시스템 프롬프트 정의
- ✅ 컨텍스트 삽입 템플릿
- ✅ 대화 히스토리 포맷
- ✅ 다양한 시나리오 테스트 프롬프트

**Assigned To**: ai-expert

---

### T2.4: AI 응답 생성 서비스
**Description**:
고객 메시지 → AI 응답 생성 파이프라인:

```python
class AIResponseService:
    async def generate_response(conversation_id: int, customer_message: str) → AIResponse:
        # 1. 대화 히스토리 로드 (최근 N개)
        # 2. RAG 컨텍스트 검색
        # 3. GPT-4 호출 (시스템 프롬프트 + 컨텍스트 + 히스토리 + 메시지)
        # 4. confidence 추출
        # 5. AI 메시지 DB 저장
        # 6. 에스컬레이션 판단
        # 7. AIResponse(text, confidence) 반환
```

**Acceptance Criteria**:
- ✅ RAG + GPT-4 통합 응답 생성
- ✅ 대화 히스토리 포함 (최근 10개)
- ✅ confidence 추출 (0.0~1.0)
- ✅ DB 저장 (Message with sender=AI)
- ✅ 에러 시 기본 메시지 반환
- ✅ 단위 테스트

**Assigned To**: ai-expert

---

### T2.5: Confidence 점수 계산
**Description**:
응답 신뢰도 계산 로직:

```python
class ConfidenceCalculator:
    def calculate(
        ai_response: str,
        rag_similarity: float,      # KB 매칭 유사도 (0~1)
        conversation_history: list,  # 이전 메시지들
    ) → float:
        # weighted average:
        # - RAG similarity: 40%
        # - Response coherence: 30%
        # - Conversation context: 30%
```

임계값:
- `> 0.7`: 높은 확신 → 정상 응답
- `0.5 ~ 0.7`: 보통 → 응답하되 모니터링
- `< 0.5`: 낮은 확신 → 에스컬레이션 트리거

**Acceptance Criteria**:
- ✅ 가중 평균 계산
- ✅ 설정 파일에서 임계값 관리
- ✅ 단위 테스트 (다양한 시나리오)

**Assigned To**: ai-expert

---

### T2.6: 에스컬레이션 감지 서비스
**Description**:
에스컬레이션 트리거 조건:

```python
class EscalationDetector:
    async def should_escalate(conversation_id, message, confidence) → bool:
        # 1. 낮은 confidence (< 0.5)
        # 2. 연속 N회 낮은 confidence
        # 3. 키워드 감지 ("상담사 연결", "사람과 통화", "환불", "클레임")
        # 4. 대화 길이 초과 (메시지 > threshold)
        # 5. 고객 명시적 요청

    async def trigger_escalation(conversation_id, reason) → EscalationEvent:
        # 1. 대화 상태 ESCALATED로 변경
        # 2. EscalationEvent 생성
        # 3. Slack 알림 전송
        # 4. 시스템 메시지 추가 ("전문 상담사에게 연결합니다")
```

**Acceptance Criteria**:
- ✅ 5가지 에스컬레이션 조건 구현
- ✅ 키워드 목록 설정 파일 관리
- ✅ Slack 알림 연동
- ✅ 상태 전이 + 시스템 메시지
- ✅ 단위 테스트

**Assigned To**: ai-expert

---

### T2.7: WebSocket 실시간 메시징 (선택)
**Description**:
실시간 채팅을 위한 WebSocket 엔드포인트:

```python
@app.websocket("/ws/chat/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: int):
    await websocket.accept()
    # 메시지 수신 → AI 응답 → 실시간 전송
```

- 폴링 대비 UX 향상
- 선택적 구현 (Phase 4에서 폴링으로 대체 가능)

**Acceptance Criteria**:
- ✅ WebSocket 연결/해제 처리
- ✅ 메시지 실시간 전송
- ✅ 연결 끊김 복구
- ✅ 폴링 폴백 지원

**Assigned To**: ai-expert

---

### T2.8: Backend 단위 테스트 스위트
**Description**:
pytest 기반 테스트 스위트:

```
tests/
├── conftest.py               # 공통 fixtures (async DB, test client)
├── test_api/
│   ├── test_auth.py          # 인증 API
│   ├── test_chat.py          # 고객 채팅 API
│   ├── test_admin.py         # 관리자 API
│   └── test_knowledge.py     # KB API
├── test_services/
│   ├── test_conversation.py  # 대화 서비스
│   ├── test_ai_response.py   # AI 응답 (mock OpenAI)
│   ├── test_rag.py           # RAG 검색
│   └── test_escalation.py    # 에스컬레이션
└── test_models/
    └── test_models.py        # 모델 검증
```

**Acceptance Criteria**:
- ✅ 80%+ 코드 커버리지
- ✅ API 엔드포인트 전체 테스트
- ✅ 서비스 로직 단위 테스트
- ✅ OpenAI mock으로 AI 테스트
- ✅ `pytest --cov` 성공

**Assigned To**: ai-expert

---

## PHASE 3: Frontend Implementation (8 Tasks)

**Owner**: frontend-dev
**Duration**: 6h
**Depends On**: Phase 0 (T0.2, T0.6), Phase 1 API 계약
**Parallel With**: Phase 2 (AI/RAG)와 병렬 실행
**Deliverables**: 6개 화면 + MVVM ViewModels + API 연동

### T3.1: 공통 컴포넌트 라이브러리
**Description**:
재사용 UI 컴포넌트 구현:

```typescript
// components/
Badge.tsx          // 상태 뱃지 (color variants)
Button.tsx         // Primary, Secondary, Danger variants
Card.tsx           // KPI 카드, 정보 카드
DataTable.tsx      // 정렬/페이징 테이블
FilterBar.tsx      // 검색 + 필터 드롭다운
Modal.tsx          // 모달 오버레이
Sidebar.tsx        // 관리자 사이드바 네비게이션
MessageBubble.tsx  // 채팅 메시지 버블 (AI/Customer/Admin/System)
InputField.tsx     // 텍스트 입력 (label, error state)
LoadingSpinner.tsx // 로딩 인디케이터
```

**Acceptance Criteria**:
- ✅ 10+ 공통 컴포넌트
- ✅ 디자인 토큰 기반 스타일링
- ✅ TypeScript props 타입 정의
- ✅ 반응형 디자인

**Assigned To**: frontend-dev

---

### T3.2: 고객 채팅 화면 (/chat)
**Description**:
Stripe 스타일 고객 채팅 인터페이스:
- 메시지 버블 (AI: 왼쪽/화이트, 고객: 오른쪽/블루)
- 입력 필드 + 전송 버튼
- 타이핑 인디케이터 (AI 응답 대기 중)
- 에스컬레이션 다이얼로그 (이름, 이메일 폼)
- 최신 메시지로 자동 스크롤
- MVVM: `useCustomerChatViewModel`

```typescript
// hooks/useCustomerChatViewModel.ts
interface CustomerChatViewModel {
  messages: Message[]
  isLoading: boolean
  isEscalated: boolean
  sendMessage: (text: string) => Promise<void>
  startConversation: (name: string, email: string, topic: string) => Promise<void>
}
```

**Acceptance Criteria**:
- ✅ UX Spec 420x720px 기준 레이아웃 (모바일 최적화)
- ✅ 메시지 전송 → API 호출 → AI 응답 수신
- ✅ 에스컬레이션 시 다이얼로그 표시
- ✅ 타이핑 인디케이터 동작
- ✅ 폴링 또는 WebSocket으로 새 메시지 수신

**Assigned To**: frontend-dev

---

### T3.3: 관리자 로그인 화면 (/login)
**Description**:
Split layout 로그인 화면:
- 왼쪽: 브랜딩 (로고, 프로젝트명, 설명)
- 오른쪽: 로그인 폼 (이메일, 비밀번호)
- 로딩 상태, 에러 메시지
- MVVM: `useLoginViewModel`

**Acceptance Criteria**:
- ✅ UX Spec 1440x900px 기준 레이아웃
- ✅ 폼 검증 (이메일 형식, 비밀번호 최소 길이)
- ✅ API 호출 → JWT 저장 → /dashboard 리다이렉트
- ✅ 에러 핸들링 (잘못된 자격 증명)

**Assigned To**: frontend-dev

---

### T3.4: 대시보드 화면 (/dashboard)
**Description**:
관리자 대시보드:
- 4개 KPI 카드 (총 대화수, AI 해결률, 평균 응답시간, 에스컬레이션)
- 추세 라인 차트 (일별 대화수 vs 에스컬레이션)
- 카테고리 도넛 차트
- 최근 에스컬레이션 테이블
- MVVM: `useDashboardViewModel`

차트 라이브러리: Recharts (React 네이티브, lightweight)

**Acceptance Criteria**:
- ✅ KPI 카드 4개 API 연동
- ✅ 추세 차트 렌더링
- ✅ 카테고리 차트 렌더링
- ✅ 최근 에스컬레이션 테이블
- ✅ 반응형 레이아웃

**Assigned To**: frontend-dev

---

### T3.5: 대화 목록 화면 (/conversations)
**Description**:
대화 목록 + 필터 + 페이지네이션:
- 검색 입력
- 3개 필터 (상태, 기간, AI 해결 여부)
- 7열 테이블 (고객, 주제, 상태, 시간, AI 해결, 메시지 수, 액션)
- 페이지네이션 컨트롤
- 행 클릭 → 상세 페이지
- MVVM: `useConversationListViewModel`

**Acceptance Criteria**:
- ✅ API 연동 (필터, 페이징)
- ✅ 상태 뱃지 색상 (UX Spec 기준)
- ✅ 행 클릭 네비게이션
- ✅ 필터 조합 동작
- ✅ 빈 상태 처리

**Assigned To**: frontend-dev

---

### T3.6: 대화 상세 화면 (/conversations/[id])
**Description**:
Split layout 대화 상세:
- 왼쪽 2/3: 채팅 로그 (메시지 버블, 시스템 메시지)
- 오른쪽 1/3: 고객 정보 + 대화 메타데이터 + 액션 버튼
- 관리자 메시지 입력 필드
- 액션: 메시지 전송, 해결 처리, 재에스컬레이션
- MVVM: `useConversationDetailViewModel`

**Acceptance Criteria**:
- ✅ Split layout 렌더링
- ✅ 메시지 타입별 스타일링 (AI/고객/관리자/시스템)
- ✅ 관리자 메시지 전송 동작
- ✅ 해결 처리 동작 (상태 변경)
- ✅ 실시간 업데이트 (폴링)

**Assigned To**: frontend-dev

---

### T3.7: Knowledge Base 화면 (/knowledge)
**Description**:
KB 관리 화면:
- 검색 + 카테고리 필터
- 문서 카드 리스트 (제목, 카테고리, 태그, 활성 상태)
- 추가 버튼
- 편집 모달 (제목, 카테고리, 태그, 내용, 활성 토글)
- MVVM: `useKnowledgeBaseViewModel`

**Acceptance Criteria**:
- ✅ 문서 목록 API 연동
- ✅ CRUD 전체 동작 (생성, 조회, 수정, 삭제)
- ✅ 편집 모달 동작
- ✅ 태그 편집 (추가/제거)
- ✅ 활성/비활성 토글

**Assigned To**: frontend-dev

---

### T3.8: 프론트엔드 컴포넌트 테스트
**Description**:
Jest + React Testing Library 기반 테스트:

```
__tests__/
├── components/       # 공통 컴포넌트 테스트
├── hooks/            # ViewModel 테스트
└── pages/            # 페이지 렌더링 테스트
```

**Acceptance Criteria**:
- ✅ 공통 컴포넌트 테스트 (10+ 컴포넌트)
- ✅ ViewModel 테스트 (API mock)
- ✅ 페이지 렌더링 스모크 테스트
- ✅ 80%+ 커버리지
- ✅ `npm test` 성공

**Assigned To**: frontend-dev

---

## PHASE 4: Integration & Testing (10 Tasks)

**Owner**: qa-executor + code-reviewer
**Duration**: 4h
**Depends On**: Phase 2, Phase 3 완료
**Deliverables**: E2E 테스트, 성능 테스트, 최종 검증

### T4.1: Docker Compose 전체 환경 통합
**Description**:
전체 서비스 Docker Compose:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
  backend:
    build: ./backend
    depends_on: [db]
    environment:
      - DATABASE_URL=postgresql+asyncpg://...
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
  frontend:
    build: ./frontend
    depends_on: [backend]
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
```

**Acceptance Criteria**:
- ✅ `docker-compose up` 으로 전체 기동
- ✅ Frontend → Backend → DB 연결 확인
- ✅ 환경변수 문서화

**Assigned To**: ai-expert

---

### T4.2: 시드 데이터 (테스트용)
**Description**:
개발/테스트용 초기 데이터:
- Admin 사용자 (admin@voc.ai / admin123)
- KB 문서 5개 (결제, 배송, 계정, 주문, 프로모션)
- 샘플 대화 3개 (정상, 에스컬레이션, 해결됨)

**Acceptance Criteria**:
- ✅ seed 스크립트 (`python scripts/seed.py`)
- ✅ 개발 환경 초기화 시 자동 실행 옵션
- ✅ KB 문서에 임베딩 포함

**Assigned To**: ai-expert

---

### T4.3: E2E 테스트 — 고객 플로우
**Description**:
Playwright E2E:
- 고객 채팅 시작 → 메시지 전송 → AI 응답 수신
- 에스컬레이션 트리거 → 다이얼로그 표시 → 폼 제출

**Acceptance Criteria**:
- ✅ 정상 채팅 플로우 테스트
- ✅ 에스컬레이션 플로우 테스트
- ✅ `npx playwright test` 성공

**Assigned To**: qa-executor

---

### T4.4: E2E 테스트 — 관리자 플로우
**Description**:
Playwright E2E:
- 로그인 → 대시보드 확인
- 대화 목록 → 필터 → 상세 페이지
- 관리자 메시지 전송 → 해결 처리
- KB 문서 생성/수정/삭제

**Acceptance Criteria**:
- ✅ 관리자 전체 플로우 테스트
- ✅ KB CRUD 테스트
- ✅ `npx playwright test` 성공

**Assigned To**: qa-executor

---

### T4.5: API 통합 테스트
**Description**:
Backend API 통합 테스트 (실제 DB 사용):
- Testcontainers (PostgreSQL + pgvector)
- 전체 API 플로우 테스트
- 트랜잭션 롤백 확인

**Acceptance Criteria**:
- ✅ 통합 테스트 환경 설정
- ✅ 전체 API 엔드포인트 테스트
- ✅ `pytest tests/integration/` 성공

**Assigned To**: qa-executor

---

### T4.6: 성능 테스트
**Description**:
기본 성능 검증:
- API 응답 시간 측정 (p50, p95, p99)
- 동시 접속 테스트 (10, 50, 100 concurrent)
- Frontend Lighthouse 스코어
- DB 쿼리 성능 (slow query 분석)

**Acceptance Criteria**:
- ✅ API p95 < 500ms (AI 제외)
- ✅ Lighthouse > 90 (Performance)
- ✅ 100 동시 접속 처리 확인

**Assigned To**: qa-executor

---

### T4.7: 보안 검토
**Description**:
OWASP Top 10 기반 보안 점검:
- SQL Injection (SQLAlchemy parameterized)
- XSS (React 자동 이스케이프)
- CSRF (SameSite cookie)
- JWT 검증 (만료, 서명)
- 민감 정보 노출 (비밀번호 해시, API 키)

**Acceptance Criteria**:
- ✅ 주요 취약점 0건
- ✅ JWT 만료/갱신 동작
- ✅ 비밀번호 해시 확인
- ✅ .env 파일 gitignore 확인

**Assigned To**: code-reviewer

---

### T4.8: 코드 리뷰 (Backend)
**Description**:
Backend 전체 코드 리뷰:
- 코드 품질, 패턴 일관성
- 에러 핸들링 완전성
- 테스트 커버리지 확인
- 성능 이슈 (N+1 쿼리 등)

**Acceptance Criteria**:
- ✅ code-reviewer 승인
- ✅ 심각도 High 이슈 0건
- ✅ 리뷰 피드백 반영

**Assigned To**: code-reviewer

---

### T4.9: 코드 리뷰 (Frontend)
**Description**:
Frontend 전체 코드 리뷰:
- 컴포넌트 구조, MVVM 패턴 준수
- 접근성 (a11y) 기본 검사
- 디자인 토큰 일관성
- 반응형 디자인 확인

**Acceptance Criteria**:
- ✅ code-reviewer 승인
- ✅ MVVM 패턴 준수 확인
- ✅ 리뷰 피드백 반영

**Assigned To**: code-reviewer

---

### T4.10: 최종 검증 & 릴리스 체크리스트
**Description**:
릴리스 전 최종 확인:
- [ ] 모든 테스트 통과 (unit + integration + E2E)
- [ ] 보안 리뷰 완료
- [ ] 코드 리뷰 완료
- [ ] Docker Compose 전체 기동 확인
- [ ] README 업데이트
- [ ] .env.example 최신화
- [ ] 시드 데이터 동작 확인

**Acceptance Criteria**:
- ✅ 체크리스트 전체 완료
- ✅ README에 설치/실행 가이드
- ✅ 배포 준비 완료

**Assigned To**: qa-executor

---

## Task Dependencies & Parallelization

### 의존성 그래프
```
Phase 0: T0.1~T0.6 (모두 병렬 가능)
    │
    ├── Phase 1: T1.1~T1.10 (순차, T0.1 의존)
    │       │
    │       ├── Phase 2: T2.1~T2.8 (AI/RAG, T1.* 의존)
    │       │
    │       └── Phase 3: T3.1~T3.8 (Frontend, T1 API 계약만 필요)
    │               │         ↑ Phase 2와 병렬 실행 ↑
    │               │
    │               └── Phase 4: T4.1~T4.10 (Phase 2+3 완료 후)
```

### 병렬 실행 전략

| 시간대 | Stream A (ai-expert) | Stream B (frontend-dev) |
|--------|---------------------|------------------------|
| 0-3h | Phase 0: 인프라 셋업 | Phase 0: 프론트엔드 셋업 |
| 3-9h | Phase 1: Backend Core | (대기 또는 공통 컴포넌트) |
| 9-14h | Phase 2: AI & RAG | Phase 3: Frontend 6개 화면 |
| 14-18h | Phase 4: 통합 & 테스트 (공동) |

### 예상 소요 시간

| 방식 | 소요 시간 |
|------|-----------|
| **병렬 (2 에이전트)** | 16-20 hours |
| **순차 실행** | 28-32 hours |

**Java 대비 절감**: ~12시간 (Gradle 멀티모듈 + 보일러플레이트 제거)

---

## Quality Gates

### Phase 0 → Phase 1
- ✅ `uvicorn` 서버 기동
- ✅ `npm run dev` 기동
- ✅ Docker DB 연결
- ✅ JWT 인증 동작

### Phase 1 → Phase 2/3
- ✅ 전체 API 엔드포인트 Swagger 문서
- ✅ DB 마이그레이션 적용
- ✅ 단위 테스트 통과

### Phase 2/3 → Phase 4
- ✅ AI 응답 생성 동작
- ✅ 6개 화면 렌더링
- ✅ API 연동 완료

### Phase 4 → Release
- ✅ E2E 테스트 통과
- ✅ 보안 리뷰 완료
- ✅ 코드 리뷰 승인
- ✅ 성능 기준 충족

---

## File Structure

```
voc-ai-assistant/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   └── deps.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── escalation.py
│   │   │   └── knowledge.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── knowledge.py
│   │   │   └── dashboard.py
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── admin.py
│   │   │   └── knowledge.py
│   │   └── services/
│   │       ├── conversation.py
│   │       ├── ai_response.py
│   │       ├── rag.py
│   │       ├── embedding.py
│   │       ├── escalation.py
│   │       ├── knowledge.py
│   │       └── notification.py
│   ├── alembic/
│   ├── tests/
│   ├── scripts/seed.py
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── chat/page.tsx
│   │   ├── login/page.tsx
│   │   └── (admin)/
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── conversations/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       └── knowledge/page.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── __tests__/
│   ├── package.json
│   └── Dockerfile
├── figma-plugin/             # Already complete
├── docker-compose.yml
├── docs/
│   └── UX_SPECIFICATION.md
├── plans/
│   └── PLAN-001_implementation.md
├── .gitignore
├── .env.example
└── README.md
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-13 | Initial plan (Java/Spring Boot) |
| **2.0** | **2026-03-13** | **Python/FastAPI 전환 — 42 tasks, 5 phases** |

---

## Changes from v1.0

| 항목 | v1.0 (Java) | v2.0 (Python) |
|------|-------------|---------------|
| **Backend** | Spring Boot + Gradle 4모듈 | FastAPI 단일 서비스 |
| **AI** | 별도 서비스 (Phase 4) | Backend에 통합 (Phase 2) |
| **DB** | JPA + Flyway | SQLAlchemy + Alembic |
| **Tasks** | 52 | 42 (10개 감소) |
| **Phases** | 7 (0~6) | 5 (0~4) |
| **소요시간** | 40-48h | 28-32h |
| **병렬 실행** | 24-28h | 16-20h |
