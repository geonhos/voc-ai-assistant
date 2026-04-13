# VOC AI Assistant

AI 기반 고객 VOC(Voice of Customer) 자동 응답 시스템. 고객 문의를 RAG 파이프라인으로 처리하고, 신뢰도가 낮으면 자동으로 상담사에게 에스컬레이션합니다.

## 주요 기능

### 고객 채팅 포털
- 익명 대화 시작 → AI 자동 응답
- 에스컬레이션 시 연락처 수집
- 대화 이력 조회 (로그인 사용자)

### 가맹점(PG) AI 챗봇
- **Tool-Use 2-pass 파이프라인**: 거래 조회, 정산 확인, 오류 코드 분석 등
- **멀티턴 명확화**: 질문이 불완전하면 추가 정보를 요청한 뒤 정확한 답변 제공
- 가맹점 전용 지식베이스 기반 RAG

### 관리자 대시보드
- 대화 목록 (필터, 검색, 페이징)
- 대화 상세 (메시지 타임라인 + 관리자 답장)
- 에스컬레이션/상태 관리
- 지식베이스 CRUD
- 가맹점 관리 (목록, 상세, 사용자 생성)

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), PostgreSQL + pgvector, Alembic |
| **AI/LLM** | Ollama (exaone3.5:7.8b), nomic-embed-text, RAG with pgvector |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, react-markdown |
| **인증** | JWT (access + refresh), bcrypt, 역할 기반 (ADMIN / MERCHANT / CUSTOMER) |
| **인프라** | Docker Compose, pgvector/pgvector:pg16 |

## 환경 설정

### 사전 요구사항

- Python 3.9+
- Node.js 18+
- PostgreSQL 16 (pgvector 확장)
- [Ollama](https://ollama.ai) (로컬 LLM)

### 1. 저장소 클론

```bash
git clone https://github.com/geonhos/voc-ai-assistant.git
cd voc-ai-assistant
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집합니다:

```env
# 필수
DATABASE_URL=postgresql+asyncpg://voc:vocpassword@localhost:5432/voc_ai
JWT_SECRET_KEY=your-random-secret-key-here    # 반드시 변경!

# Ollama (기본값 사용 가능)
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=exaone3.5:7.8b
OLLAMA_EMBED_MODEL=nomic-embed-text

# 선택
SLACK_WEBHOOK_URL=                             # 에스컬레이션 알림용
CORS_ORIGINS=["http://localhost:3000"]
```

### 3. Ollama 모델 설치

```bash
ollama pull exaone3.5:7.8b       # 채팅 모델 (~4.8GB)
ollama pull nomic-embed-text     # 임베딩 모델 (~274MB)
```

### 4. 백엔드 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# DB 마이그레이션
alembic upgrade head

# 시드 데이터 (데모 계정 + PG 지식베이스)
python -m app.scripts.seed_pg_data
python -m app.scripts.seed_pg_knowledge

# 서버 시작
uvicorn app.main:app --reload --port 8000
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose (대안)

```bash
docker-compose up -d
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m app.scripts.seed_pg_data
```

## 접속 정보

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:3000 |
| API 문서 (Swagger) | http://localhost:8000/docs |
| API 문서 (ReDoc) | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

### 기본 계정 (시드 후)

| 포털 | 계정 | 비밀번호 |
|------|------|----------|
| 관리자 (`/login`) | `admin@test.com` | `admin1234` |
| 가맹점 (`/merchant/login`) | MID: `M001` | `merchant123` |
| 고객 (`/customer/login`) | 데모 계정 선택 (UI) | — |

> 프로덕션 환경에서는 반드시 기본 계정을 변경하세요.

## 프로젝트 구조

```
voc-ai-assistant/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # 라우트 핸들러
│   │   │   ├── auth.py       #   인증 (로그인, 토큰 리프레시)
│   │   │   ├── chat.py       #   고객 채팅
│   │   │   ├── customer_chat.py  # 고객 포털 채팅
│   │   │   ├── merchant_chat.py  # 가맹점 채팅
│   │   │   ├── merchant_admin.py # 가맹점 관리 (관리자)
│   │   │   ├── admin.py      #   관리자 대시보드/대화 관리
│   │   │   └── knowledge.py  #   지식베이스 CRUD
│   │   ├── core/             # 설정, DB, 보안
│   │   ├── models/           # SQLAlchemy ORM 모델
│   │   ├── schemas/          # Pydantic 요청/응답 스키마
│   │   ├── services/         # 비즈니스 로직
│   │   │   ├── ai_response.py      # AI 응답 생성 (RAG + Tool-Use)
│   │   │   ├── completeness.py     # 질문 완전성 평가
│   │   │   ├── clarification_state.py  # 멀티턴 상태 관리
│   │   │   ├── tool_router.py      # Tool-Use 의도 분류
│   │   │   └── embedding.py        # 벡터 임베딩 생성
│   │   ├── tools/            # Tool-Use 도구 (거래, 정산, 오류코드)
│   │   └── scripts/          # 시드 스크립트
│   ├── alembic/              # DB 마이그레이션
│   └── tests/                # 테스트 (248개)
├── frontend/
│   ├── app/                  # Next.js 페이지
│   │   ├── (admin)/          #   관리자 페이지
│   │   ├── customer/         #   고객 포털
│   │   └── merchant/         #   가맹점 포털
│   ├── components/           # UI 컴포넌트
│   ├── hooks/                # ViewModel 훅 (MVVM)
│   ├── contexts/             # AuthContext
│   └── lib/                  # API 클라이언트, 타입
├── docker-compose.yml
├── .env.example
└── README.md
```

## API 엔드포인트

모든 엔드포인트는 `/api/v1` 프리픽스를 사용합니다.

### 인증

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/login` | 관리자 로그인 |
| POST | `/auth/merchant/login` | 가맹점 로그인 (MID + 비밀번호) |
| POST | `/auth/customer/login` | 고객 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| GET | `/auth/me` | 현재 사용자 정보 |

### 고객 채팅

| Method | Path | 설명 |
|--------|------|------|
| POST | `/chat/conversations` | 익명 대화 시작 |
| POST | `/chat/conversations/{id}/messages` | 메시지 전송 (AI 자동 응답) |
| GET | `/chat/conversations/{id}/messages` | 대화 메시지 조회 |
| PUT | `/chat/conversations/{id}/contact` | 연락처 정보 제출 |

### 가맹점 채팅

| Method | Path | 설명 |
|--------|------|------|
| POST | `/merchant/conversations` | 가맹점 대화 시작 |
| POST | `/merchant/conversations/{id}/messages` | 메시지 전송 (Tool-Use AI) |
| GET | `/merchant/conversations/{id}/messages` | 대화 메시지 조회 |
| GET | `/merchant/conversations` | 가맹점 대화 목록 |

### 관리자

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/conversations` | 대화 목록 (필터, 페이징) |
| GET | `/admin/conversations/{id}` | 대화 상세 |
| PATCH | `/admin/conversations/{id}/status` | 상태 변경 |
| POST | `/admin/conversations/{id}/messages` | 관리자 답장 |
| GET | `/admin/dashboard/stats` | 대시보드 통계 |
| GET | `/admin/merchants/` | 가맹점 목록 |

### 지식베이스

| Method | Path | 설명 |
|--------|------|------|
| POST | `/knowledge/` | 문서 생성 |
| GET | `/knowledge/` | 문서 목록 |
| GET | `/knowledge/{id}` | 문서 상세 |
| PATCH | `/knowledge/{id}` | 문서 수정 |
| DELETE | `/knowledge/{id}` | 문서 삭제 |

## 테스트

```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v          # 전체 테스트 (248개)

cd ../frontend
npx tsc --noEmit                    # 타입 체크
```

## 라이선스

MIT
