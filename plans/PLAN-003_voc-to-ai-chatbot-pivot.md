# Execution Plan: VOC 티켓 시스템 → AI 챗봇 시스템 전환

## Overview
- **Plan ID**: PLAN-003
- **Complexity**: complex (score: 28)
  - Tasks: 48+ (48pts)
  - Agents: 4 (backend-dev, ai-expert, frontend-dev, database-expert) (8pts)
  - Parallel groups: 6 (9pts)
  - External integrations: Slack Webhook, Ollama LLM (6pts)
  - AI/ML involvement (5pts)
  - Database migrations (2pts)
- **Estimated Tasks**: 48
- **Agents Involved**: database-expert, backend-dev, ai-expert, frontend-dev, devops-engineer
- **Approach**: Phase 단위 순차 실행, Phase 내 병렬 실행 최대화

## Validation Result
- Score: 9/10
- Completeness: 2/2 (모든 요구사항이 태스크에 매핑됨)
- Dependencies: 2/2 (순환 없음, 모든 의존성 유효)
- Agent Assignment: 2/2 (도메인별 최적 에이전트)
- Feasibility: 2/2 (기존 패턴 재사용으로 실현 가능)
- Testability: 1/2 (일부 WebSocket 통합 테스트는 수동 검증 필요)
- Issues: WebSocket 실시간 채팅 E2E 테스트는 Playwright 설정 후 별도 Phase에서 커버

---

## 재사용 자산 식별

### 그대로 유지 (변경 없음)
- `docker-compose.yml` (postgres, redis, ollama, minio, nginx)
- `backend/voc-domain/.../user/` (User, UserRole, UserRepository)
- `backend/voc-domain/.../common/` (BaseEntity, Auditable)
- `backend/voc-adapter/.../security/` (JwtTokenProvider, JwtAuthenticationFilter)
- `backend/voc-adapter/.../auth/` (AuthController, LoginRequest/Response, DTOs)
- `backend/voc-application/.../auth/` (LoginService, auth ports)
- `backend/voc-adapter/.../notification/SlackNotificationAdapter.java`
- `backend/voc-adapter/.../notification/SlackProperties.java`
- `backend/voc-adapter/.../persistence/vector/` (VectorSearchAdapter, VectorEmbeddingEntity, VectorEmbeddingRepository)
- `frontend/src/lib/` (API client, axios, token refresh)
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/providers/`
- Flyway migrations V1-V14 (기존 스키마 유지, 새 테이블만 추가)

### 삭제 대상 (VOC 전용 코드)
- `backend/voc-domain/.../voc/` (Voc, VocDomain, VocPriority 등)
- `backend/voc-domain/.../category/`
- `backend/voc-domain/.../notification/`
- `backend/voc-domain/.../email/`
- `backend/voc-application/.../voc/`
- `backend/voc-application/.../email/`
- `backend/voc-application/.../category/`
- `backend/voc-adapter/.../voc/`
- `backend/voc-adapter/.../email/`
- `backend/voc-adapter/.../category/`
- `backend/voc-adapter/.../audit/`
- `backend/voc-adapter/.../kpi/`
- `ai-service/app/services/analysis_service.py`
- `ai-service/app/services/sentiment_service.py`
- `ai-service/app/services/rule_based_analyzer.py`
- `ai-service/app/services/confidence_calculator.py`
- `ai-service/app/services/metrics_service.py`
- `frontend/src/app/(main)/` (VOC 대시보드)
- `frontend/src/app/(customer)/` (고객 VOC 폼)
- `frontend/src/hooks/` (VOC 관련 hooks 전체, useAuth 제외)
- `frontend/src/components/` (VOC 관련 컴포넌트)

---

## Phase 0: Cleanup - 기존 VOC 코드 제거
> 기존 VOC 전용 코드를 제거하고, 재사용 코드만 남깁니다.

### Parallel Group 0-A: Backend Cleanup

#### T-CLEAN-001
```yaml
id: T-CLEAN-001
type: DELETE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/voc/
  action: delete (entire directory)
description: |
  VOC 도메인 엔티티 전체 삭제 (Voc, VocDomain, VocPriority, VocStatus, BulkOperationResult 등).
  User, BaseEntity, Auditable은 유지.
dependencies: []
verification:
  command: "find backend/voc-domain/src -path '*/voc/*' -name '*.java' | wc -l"
  expected: "0"
acceptance_criteria:
  - [ ] voc/ 디렉토리 완전 삭제
  - [ ] category/, email/, notification/ 디렉토리 삭제
  - [ ] user/, common/ 디렉토리 유지 확인
```

#### T-CLEAN-002
```yaml
id: T-CLEAN-002
type: DELETE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/
  action: delete VOC/email/category 관련 (auth 유지)
description: |
  VOC, email, category 관련 UseCase, Port, Service 삭제.
  auth/ 패키지는 그대로 유지.
dependencies: []
verification:
  command: "find backend/voc-application/src -path '*/voc/*' -name '*.java' | wc -l"
  expected: "0"
acceptance_criteria:
  - [ ] auth/ 패키지 유지
  - [ ] voc/, email/, category/ 관련 코드 삭제
```

#### T-CLEAN-003
```yaml
id: T-CLEAN-003
type: DELETE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/
  action: delete VOC 관련 adapter (auth, security, slack, vector 유지)
description: |
  VOC 전용 컨트롤러, persistence adapter, email adapter 삭제.
  유지: auth/, security/, notification/Slack*, vector/
dependencies: []
verification:
  command: "find backend/voc-adapter/src/main -path '*/web/voc/*' | wc -l"
  expected: "0"
acceptance_criteria:
  - [ ] web/auth/, security/ 유지
  - [ ] notification/Slack* 유지
  - [ ] persistence/vector/ 유지
  - [ ] VOC, email, category, audit, kpi adapter 삭제
```

#### T-CLEAN-004
```yaml
id: T-CLEAN-004
type: DELETE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-*/src/test/
  action: delete VOC 관련 테스트 (auth 테스트 유지)
description: |
  삭제된 소스에 대응하는 테스트 파일 삭제.
dependencies: [T-CLEAN-001, T-CLEAN-002, T-CLEAN-003]
verification:
  command: "cd backend && ./gradlew compileJava 2>&1 | tail -5"
  expected: "BUILD SUCCESSFUL"
acceptance_criteria:
  - [ ] 컴파일 성공
  - [ ] auth 관련 테스트 유지
```

### Parallel Group 0-B: AI Service Cleanup (병렬 with 0-A)

#### T-CLEAN-005
```yaml
id: T-CLEAN-005
type: DELETE
duration: 3 min
agent: ai-expert
file:
  path: ai-service/app/services/
  action: delete VOC 분석 관련 (embedding_service 유지)
description: |
  analysis_service.py, sentiment_service.py, rule_based_analyzer.py,
  confidence_calculator.py, metrics_service.py 삭제.
  embedding_service.py 유지.
dependencies: []
verification:
  command: "ls ai-service/app/services/*.py"
  expected: "__init__.py, embedding_service.py"
acceptance_criteria:
  - [ ] embedding_service.py 유지
  - [ ] VOC 분석 서비스 전체 삭제
```

#### T-CLEAN-006
```yaml
id: T-CLEAN-006
type: MODIFY
duration: 3 min
agent: ai-expert
file:
  path: ai-service/app/api/routes.py
  action: modify
description: |
  VOC 분석 관련 엔드포인트 제거. 헬스체크와 임베딩 관련만 유지.
dependencies: [T-CLEAN-005]
verification:
  command: "cd ai-service && python -c 'from app.api.routes import router; print(\"OK\")'"
  expected: "OK"
acceptance_criteria:
  - [ ] VOC 분석 엔드포인트 제거
  - [ ] 헬스체크 유지
  - [ ] import 에러 없음
```

### Parallel Group 0-C: Frontend Cleanup (병렬 with 0-A, 0-B)

#### T-CLEAN-007
```yaml
id: T-CLEAN-007
type: DELETE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/, frontend/src/app/(customer)/
  action: delete
description: |
  VOC 대시보드와 고객 폼 페이지 삭제.
  (auth), (public), layout.tsx 유지.
dependencies: []
verification:
  command: "ls frontend/src/app/"
  expected: "(auth) (public) icon.svg layout.tsx"
acceptance_criteria:
  - [ ] (main)/, (customer)/ 삭제
  - [ ] (auth)/ 유지
  - [ ] layout.tsx 유지
```

#### T-CLEAN-008
```yaml
id: T-CLEAN-008
type: DELETE
duration: 3 min
agent: frontend-dev
file:
  path: frontend/src/hooks/, frontend/src/components/
  action: delete VOC 관련 (useAuth 유지)
description: |
  VOC 관련 hooks와 컴포넌트 삭제. useAuth.ts 유지.
dependencies: []
verification:
  command: "ls frontend/src/hooks/"
  expected: "useAuth.ts"
acceptance_criteria:
  - [ ] useAuth.ts 유지
  - [ ] 나머지 VOC hooks 삭제
```

#### T-CLEAN-009
```yaml
id: T-CLEAN-009
type: MODIFY
duration: 3 min
agent: frontend-dev
file:
  path: frontend/src/types/
  action: delete VOC types, keep auth types
description: |
  VOC 관련 타입 정의 삭제. 인증 관련 타입 유지.
dependencies: []
verification:
  command: "cd frontend && npx tsc --noEmit 2>&1 | tail -3"
  expected: "no errors (or only from deleted references)"
acceptance_criteria:
  - [ ] auth 관련 타입 유지
  - [ ] VOC 타입 삭제
```

### Phase 0 Completion Gate
```
검증 기준:
- [ ] Backend: ./gradlew compileJava 성공
- [ ] AI Service: python -c "from app.main import app" 성공
- [ ] Frontend: npx tsc --noEmit 성공 (또는 삭제된 참조만 에러)
- [ ] Docker Compose: docker compose config 성공 (infra 변경 없음)
```

---

## Phase 1: Database Schema & Domain Model
> 새로운 채팅 시스템의 기반 테이블과 도메인 엔티티를 생성합니다.

### Parallel Group 1-A: DB Migration + Domain

#### T-DB-001
```yaml
id: T-DB-001
type: CREATE
duration: 5 min
agent: database-expert
file:
  path: backend/voc-bootstrap/src/main/resources/db/migration/V15__create_conversations_table.sql
  action: create
description: |
  conversations 테이블 생성.
  컬럼: id (UUID PK), session_id (VARCHAR UNIQUE), customer_name (VARCHAR NULL),
  customer_email (VARCHAR NULL), status (VARCHAR: ACTIVE, ESCALATED, RESOLVED, CLOSED),
  started_at (TIMESTAMP), ended_at (TIMESTAMP NULL), ai_resolved (BOOLEAN DEFAULT FALSE),
  escalated_at (TIMESTAMP NULL), created_at, updated_at.
  인덱스: status, session_id, created_at.
dependencies: []
verification:
  command: "cat backend/voc-bootstrap/src/main/resources/db/migration/V15__create_conversations_table.sql"
  expected: "CREATE TABLE conversations"
acceptance_criteria:
  - [ ] conversations 테이블 DDL 작성
  - [ ] 적절한 인덱스 포함
  - [ ] status ENUM 또는 VARCHAR CHECK
```

#### T-DB-002
```yaml
id: T-DB-002
type: CREATE
duration: 5 min
agent: database-expert
file:
  path: backend/voc-bootstrap/src/main/resources/db/migration/V16__create_messages_table.sql
  action: create
description: |
  messages 테이블 생성.
  컬럼: id (UUID PK), conversation_id (FK → conversations),
  sender_type (VARCHAR: CUSTOMER, AI, ADMIN), content (TEXT),
  confidence_score (FLOAT NULL, AI 응답일 때만),
  created_at (TIMESTAMP).
  인덱스: conversation_id, created_at.
dependencies: []
verification:
  command: "cat backend/voc-bootstrap/src/main/resources/db/migration/V16__create_messages_table.sql"
  expected: "CREATE TABLE messages"
acceptance_criteria:
  - [ ] messages 테이블 DDL
  - [ ] conversation_id FK 설정
  - [ ] sender_type 제약
```

#### T-DB-003
```yaml
id: T-DB-003
type: CREATE
duration: 5 min
agent: database-expert
file:
  path: backend/voc-bootstrap/src/main/resources/db/migration/V17__create_knowledge_articles_table.sql
  action: create
description: |
  knowledge_articles 테이블 생성.
  컬럼: id (UUID PK), title (VARCHAR), content (TEXT),
  category (VARCHAR NULL), tags (TEXT[] NULL),
  embedding (vector(1024) NULL),
  is_active (BOOLEAN DEFAULT TRUE),
  created_at, updated_at, created_by (FK → users NULL).
  인덱스: is_active, category, embedding (ivfflat for cosine).
dependencies: []
verification:
  command: "cat backend/voc-bootstrap/src/main/resources/db/migration/V17__create_knowledge_articles_table.sql"
  expected: "CREATE TABLE knowledge_articles"
acceptance_criteria:
  - [ ] knowledge_articles DDL
  - [ ] vector(1024) 컬럼
  - [ ] ivfflat 인덱스
```

### Parallel Group 1-B: Domain Entities (병렬 with 1-A)

#### T-DOM-001
```yaml
id: T-DOM-001
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/Conversation.java
  action: create
description: |
  Conversation 도메인 엔티티 생성.
  필드: id, sessionId, customerName, customerEmail, status (enum),
  startedAt, endedAt, aiResolved, escalatedAt.
  메서드: escalate(), resolve(), close(), addMessage().
dependencies: []
verification:
  command: "cd backend && ./gradlew :voc-domain:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
acceptance_criteria:
  - [ ] 도메인 엔티티 생성
  - [ ] 비즈니스 로직 메서드 포함
  - [ ] status enum 포함
```

#### T-DOM-002
```yaml
id: T-DOM-002
type: CREATE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/ConversationStatus.java
  action: create
description: |
  ConversationStatus enum: ACTIVE, ESCALATED, RESOLVED, CLOSED.
dependencies: []
verification:
  command: "cd backend && ./gradlew :voc-domain:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
```

#### T-DOM-003
```yaml
id: T-DOM-003
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/Message.java
  action: create
description: |
  Message 도메인 엔티티.
  필드: id, conversationId, senderType (enum), content, confidenceScore, createdAt.
dependencies: []
verification:
  command: "cd backend && ./gradlew :voc-domain:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
```

#### T-DOM-004
```yaml
id: T-DOM-004
type: CREATE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/SenderType.java
  action: create
description: |
  SenderType enum: CUSTOMER, AI, ADMIN.
dependencies: []
```

#### T-DOM-005
```yaml
id: T-DOM-005
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/knowledge/KnowledgeArticle.java
  action: create
description: |
  KnowledgeArticle 도메인 엔티티.
  필드: id, title, content, category, tags, isActive, createdAt, updatedAt.
  메서드: activate(), deactivate(), updateContent().
dependencies: []
verification:
  command: "cd backend && ./gradlew :voc-domain:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
```

#### T-DOM-006
```yaml
id: T-DOM-006
type: CREATE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/ConversationRepository.java
  action: create
description: |
  ConversationRepository 인터페이스 (도메인 포트).
  메서드: save, findById, findBySessionId, findByStatus, findAll (paginated).
dependencies: [T-DOM-001]
```

#### T-DOM-007
```yaml
id: T-DOM-007
type: CREATE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/conversation/MessageRepository.java
  action: create
description: |
  MessageRepository 인터페이스.
  메서드: save, findByConversationId, countByConversationId.
dependencies: [T-DOM-003]
```

#### T-DOM-008
```yaml
id: T-DOM-008
type: CREATE
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-domain/src/main/java/com/geonho/vocautobot/domain/knowledge/KnowledgeArticleRepository.java
  action: create
description: |
  KnowledgeArticleRepository 인터페이스.
  메서드: save, findById, findAll, findByCategory, delete, searchByEmbedding.
dependencies: [T-DOM-005]
```

### Phase 1 Completion Gate
```
검증 기준:
- [ ] Backend domain 모듈 컴파일 성공
- [ ] 3개 SQL 마이그레이션 파일 생성 확인
- [ ] 도메인 엔티티 6개 생성 (Conversation, ConversationStatus, Message, SenderType, KnowledgeArticle + repositories)
```

---

## Phase 2: Application Layer (Use Cases & Ports)
> 비즈니스 로직과 포트 인터페이스를 정의합니다.

### Parallel Group 2-A: Chat Use Cases

#### T-APP-001
```yaml
id: T-APP-001
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/in/StartConversationUseCase.java
  action: create
description: |
  대화 시작 UseCase 인터페이스.
  메서드: startConversation(StartConversationCommand) → ConversationDto.
dependencies: [T-DOM-001, T-DOM-006]
```

#### T-APP-002
```yaml
id: T-APP-002
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/in/SendMessageUseCase.java
  action: create
description: |
  메시지 전송 UseCase 인터페이스.
  메서드: sendMessage(SendMessageCommand) → MessageDto.
  플로우: 고객 메시지 저장 → AI Service 호출 → AI 응답 저장 → 에스컬레이션 판단.
dependencies: [T-DOM-003, T-DOM-007]
```

#### T-APP-003
```yaml
id: T-APP-003
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/in/GetConversationUseCase.java
  action: create
description: |
  대화 조회 UseCase.
  메서드: getConversation(id), getConversations(filter, pageable),
  getConversationBySession(sessionId), getMessages(conversationId).
dependencies: [T-DOM-006, T-DOM-007]
```

#### T-APP-004
```yaml
id: T-APP-004
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/in/EscalateConversationUseCase.java
  action: create
description: |
  에스컬레이션 UseCase.
  메서드: escalate(conversationId) → void.
  Slack 알림 전송 포함.
dependencies: [T-DOM-001]
```

#### T-APP-005
```yaml
id: T-APP-005
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/in/AdminInterventionUseCase.java
  action: create
description: |
  관리자 개입 UseCase.
  메서드: sendAdminMessage(conversationId, content, adminUserId) → MessageDto.
  AI → 사람 전환 처리.
dependencies: [T-DOM-001, T-DOM-003]
```

### Parallel Group 2-B: Output Ports & Knowledge UseCase (병렬 with 2-A)

#### T-APP-006
```yaml
id: T-APP-006
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/out/AiChatPort.java
  action: create
description: |
  AI 서비스 호출 출력 포트.
  메서드: generateResponse(conversationHistory, knowledgeContext) → AiResponseDto.
  AiResponseDto: content, confidenceScore, suggestedArticleIds.
dependencies: []
```

#### T-APP-007
```yaml
id: T-APP-007
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/out/NotificationPort.java
  action: create
description: |
  알림 출력 포트 (Slack 에스컬레이션용).
  메서드: sendEscalation(EscalationNotification) → void.
  기존 SlackNotificationAdapter 재사용 대상.
dependencies: []
```

#### T-APP-008
```yaml
id: T-APP-008
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/knowledge/port/in/ManageKnowledgeUseCase.java
  action: create
description: |
  Knowledge Base 관리 UseCase.
  메서드: createArticle, updateArticle, deleteArticle, getArticle,
  getArticles (paginated), searchArticles (keyword).
dependencies: [T-DOM-005, T-DOM-008]
```

#### T-APP-009
```yaml
id: T-APP-009
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/port/out/KnowledgeSearchPort.java
  action: create
description: |
  Knowledge Base 벡터 검색 출력 포트.
  메서드: searchSimilar(embeddingVector, topK) → List<KnowledgeArticleDto>.
  기존 VectorSearchAdapter 패턴 재사용.
dependencies: []
```

#### T-APP-010
```yaml
id: T-APP-010
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/chat/service/ChatService.java
  action: create
description: |
  ChatService - StartConversation, SendMessage, GetConversation, Escalate, AdminIntervention UseCase 구현체.
  핵심 플로우:
  1. 고객 메시지 수신 → 저장
  2. 대화 이력 + Knowledge 검색 결과를 AI에 전달
  3. AI 응답 저장 (confidence score 포함)
  4. confidence < threshold → 자동 에스컬레이션
dependencies: [T-APP-001, T-APP-002, T-APP-003, T-APP-004, T-APP-005, T-APP-006, T-APP-007, T-APP-009]
verification:
  command: "cd backend && ./gradlew :voc-application:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
```

#### T-APP-011
```yaml
id: T-APP-011
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/knowledge/service/KnowledgeService.java
  action: create
description: |
  KnowledgeService - ManageKnowledgeUseCase 구현체.
  CRUD + 임베딩 연동 (생성/수정 시 AI Service로 임베딩 요청).
dependencies: [T-APP-008, T-APP-006]
verification:
  command: "cd backend && ./gradlew :voc-application:compileJava 2>&1 | tail -3"
  expected: "BUILD SUCCESSFUL"
```

#### T-APP-012
```yaml
id: T-APP-012
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-application/src/main/java/com/geonho/vocautobot/application/dashboard/port/in/GetDashboardStatsUseCase.java
  action: create
description: |
  대시보드 통계 UseCase.
  메서드: getStats() → DashboardStatsDto.
  통계: 총 대화 수, AI 해결률, 평균 응답 시간, 에스컬레이션 비율, 일별 추이.
dependencies: [T-DOM-006]
```

### Phase 2 Completion Gate
```
검증 기준:
- [ ] voc-application 모듈 컴파일 성공
- [ ] UseCase 인터페이스 5개 (Chat) + 1개 (Knowledge) + 1개 (Dashboard)
- [ ] Output Port 3개 (AiChat, Notification, KnowledgeSearch)
- [ ] Service 구현체 2개 (ChatService, KnowledgeService)
```

---

## Phase 3: Adapter Layer (REST, WebSocket, Persistence, AI)
> 외부 연동 어댑터를 구현합니다.

### Parallel Group 3-A: Persistence Adapters

#### T-ADAPT-001
```yaml
id: T-ADAPT-001
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/conversation/ConversationJpaEntity.java
  action: create
description: |
  Conversation JPA 엔티티 + 매퍼.
  BaseJpaEntity 상속, conversations 테이블 매핑.
dependencies: [T-DB-001, T-DOM-001]
```

#### T-ADAPT-002
```yaml
id: T-ADAPT-002
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/conversation/ConversationPersistenceAdapter.java
  action: create
description: |
  ConversationRepository 구현체.
  JpaRepository + QueryDSL 활용.
dependencies: [T-ADAPT-001, T-DOM-006]
```

#### T-ADAPT-003
```yaml
id: T-ADAPT-003
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/conversation/MessageJpaEntity.java
  action: create
description: |
  Message JPA 엔티티.
  messages 테이블 매핑, conversation_id FK.
dependencies: [T-DB-002, T-DOM-003]
```

#### T-ADAPT-004
```yaml
id: T-ADAPT-004
type: CREATE
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/conversation/MessagePersistenceAdapter.java
  action: create
description: |
  MessageRepository 구현체.
dependencies: [T-ADAPT-003, T-DOM-007]
```

#### T-ADAPT-005
```yaml
id: T-ADAPT-005
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/knowledge/KnowledgeArticleJpaEntity.java
  action: create
description: |
  KnowledgeArticle JPA 엔티티.
  knowledge_articles 테이블 매핑, vector(1024) embedding 컬럼.
dependencies: [T-DB-003, T-DOM-005]
```

#### T-ADAPT-006
```yaml
id: T-ADAPT-006
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/persistence/knowledge/KnowledgePersistenceAdapter.java
  action: create
description: |
  KnowledgeArticleRepository 구현체.
  pgvector cosine similarity 검색 포함 (기존 VectorSearchAdapter 패턴 참조).
dependencies: [T-ADAPT-005, T-DOM-008, T-APP-009]
```

### Parallel Group 3-B: Web Adapters (병렬 with 3-A)

#### T-ADAPT-007
```yaml
id: T-ADAPT-007
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/web/chat/ChatController.java
  action: create
description: |
  고객 채팅 REST API (인증 불필요).
  POST /api/chat/conversations - 대화 시작
  POST /api/chat/conversations/{id}/messages - 메시지 전송
  GET /api/chat/conversations/{sessionId} - 세션으로 대화 조회
dependencies: [T-APP-001, T-APP-002, T-APP-003]
```

#### T-ADAPT-008
```yaml
id: T-ADAPT-008
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/web/admin/AdminConversationController.java
  action: create
description: |
  관리자 대화 관리 REST API (인증 필요).
  GET /api/admin/conversations - 대화 목록 (필터, 페이지네이션)
  GET /api/admin/conversations/{id} - 대화 상세 + 메시지
  POST /api/admin/conversations/{id}/messages - 관리자 메시지 전송
  POST /api/admin/conversations/{id}/escalate - 수동 에스컬레이션
  POST /api/admin/conversations/{id}/resolve - 해결 처리
dependencies: [T-APP-003, T-APP-004, T-APP-005]
```

#### T-ADAPT-009
```yaml
id: T-ADAPT-009
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/web/admin/KnowledgeController.java
  action: create
description: |
  Knowledge Base 관리 REST API (인증 필요).
  CRUD: GET/POST/PUT/DELETE /api/admin/knowledge
  GET /api/admin/knowledge/search?q=keyword
dependencies: [T-APP-008]
```

#### T-ADAPT-010
```yaml
id: T-ADAPT-010
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/web/admin/DashboardController.java
  action: create
description: |
  대시보드 통계 REST API (인증 필요).
  GET /api/admin/dashboard/stats
dependencies: [T-APP-012]
```

### Parallel Group 3-C: WebSocket & AI Adapter

#### T-ADAPT-011
```yaml
id: T-ADAPT-011
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/websocket/WebSocketConfig.java
  action: create
description: |
  STOMP over SockJS WebSocket 설정.
  엔드포인트: /ws-chat
  메시지 브로커: /topic (구독), /app (전송)
  CORS 설정 포함.
dependencies: []
```

#### T-ADAPT-012
```yaml
id: T-ADAPT-012
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/in/websocket/ChatWebSocketHandler.java
  action: create
description: |
  WebSocket 메시지 핸들러.
  /app/chat.send → 메시지 수신 → ChatService 호출 → /topic/conversation/{id} 로 응답 브로드캐스트.
  AI 응답 생성 중 타이핑 인디케이터 전송.
dependencies: [T-ADAPT-011, T-APP-010]
```

#### T-ADAPT-013
```yaml
id: T-ADAPT-013
type: CREATE
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/ai/AiChatAdapter.java
  action: create
description: |
  AI Service HTTP 호출 어댑터 (AiChatPort 구현).
  POST /api/chat/generate → AI Service의 새 엔드포인트 호출.
  요청: conversationHistory, knowledgeContext.
  응답: content, confidenceScore.
dependencies: [T-APP-006]
```

#### T-ADAPT-014
```yaml
id: T-ADAPT-014
type: MODIFY
duration: 4 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/main/java/com/geonho/vocautobot/adapter/out/notification/SlackNotificationAdapter.java
  action: modify
description: |
  기존 Slack 어댑터에 에스컬레이션 알림 메서드 추가.
  NotificationPort 구현 추가.
  대화 요약 + 고객 정보 + 대화 링크 포함 Slack 메시지 포맷.
dependencies: [T-APP-007]
```

#### T-ADAPT-015
```yaml
id: T-ADAPT-015
type: MODIFY
duration: 3 min
agent: backend-dev
file:
  path: backend/voc-bootstrap/src/main/java/.../SecurityConfig.java (또는 해당 위치)
  action: modify
description: |
  Security 설정 업데이트.
  /api/chat/** 경로 인증 불필요 (permitAll).
  /ws-chat/** WebSocket 엔드포인트 허용.
  /api/admin/** 경로 인증 필요.
dependencies: [T-ADAPT-007, T-ADAPT-011]
```

### Phase 3 Completion Gate
```
검증 기준:
- [ ] Backend 전체 컴파일 성공: ./gradlew compileJava
- [ ] JPA 엔티티 3개 생성
- [ ] REST Controller 4개 생성
- [ ] WebSocket 설정 + 핸들러 생성
- [ ] AI 어댑터 생성
- [ ] Slack 어댑터 에스컬레이션 기능 추가
```

---

## Phase 4: AI Service - 대화형 엔진
> FastAPI AI 서비스에 RAG 기반 챗봇 엔진을 구현합니다.

### Parallel Group 4-A: AI Core

#### T-AI-001
```yaml
id: T-AI-001
type: CREATE
duration: 5 min
agent: ai-expert
file:
  path: ai-service/app/services/chat_service.py
  action: create
description: |
  대화형 AI 엔진.
  - 대화 이력 + Knowledge 컨텍스트를 받아 응답 생성
  - Ollama LLM 호출 (system prompt + user context)
  - confidence score 계산 (Knowledge 매칭도 + 응답 길이 + 키워드 매칭)
  - 한국어 시스템 프롬프트
dependencies: [T-CLEAN-006]
verification:
  command: "cd ai-service && python -c 'from app.services.chat_service import ChatService; print(\"OK\")'"
  expected: "OK"
```

#### T-AI-002
```yaml
id: T-AI-002
type: CREATE
duration: 4 min
agent: ai-expert
file:
  path: ai-service/app/services/knowledge_service.py
  action: create
description: |
  Knowledge Base 벡터 검색 서비스.
  - 쿼리 텍스트 → 임베딩 생성 (embedding_service 재사용)
  - pgvector에서 cosine similarity 검색
  - top-K 결과 반환
dependencies: [T-CLEAN-005]
verification:
  command: "cd ai-service && python -c 'from app.services.knowledge_service import KnowledgeService; print(\"OK\")'"
  expected: "OK"
```

#### T-AI-003
```yaml
id: T-AI-003
type: CREATE
duration: 4 min
agent: ai-expert
file:
  path: ai-service/app/services/escalation_evaluator.py
  action: create
description: |
  에스컬레이션 판단 서비스.
  - confidence score < threshold (예: 0.6) → 에스컬레이션 추천
  - 반복 질문 감지 (동일 의도 3회 이상)
  - 고객 불만 감지 (감정 분석)
  - 결과: should_escalate (bool), reason (str)
dependencies: []
verification:
  command: "cd ai-service && python -c 'from app.services.escalation_evaluator import EscalationEvaluator; print(\"OK\")'"
  expected: "OK"
```

### Parallel Group 4-B: AI API Endpoints

#### T-AI-004
```yaml
id: T-AI-004
type: CREATE
duration: 5 min
agent: ai-expert
file:
  path: ai-service/app/api/chat_routes.py
  action: create
description: |
  챗봇 API 엔드포인트.
  POST /api/chat/generate - AI 응답 생성
    요청: conversation_history, knowledge_context
    응답: content, confidence_score, should_escalate, escalation_reason
  POST /api/chat/embed-query - 쿼리 임베딩 생성
  POST /api/knowledge/embed - Knowledge 문서 임베딩
  POST /api/knowledge/search - 유사 문서 검색
dependencies: [T-AI-001, T-AI-002, T-AI-003]
```

#### T-AI-005
```yaml
id: T-AI-005
type: MODIFY
duration: 3 min
agent: ai-expert
file:
  path: ai-service/app/api/routes.py
  action: modify
description: |
  메인 라우터에 chat_routes 등록.
  기존 헬스체크 유지 + 새 라우터 include.
dependencies: [T-AI-004]
```

#### T-AI-006
```yaml
id: T-AI-006
type: MODIFY
duration: 3 min
agent: ai-expert
file:
  path: ai-service/main.py
  action: modify
description: |
  FastAPI 앱 설정 업데이트.
  CORS 설정, 새 라우터 등록 확인.
dependencies: [T-AI-005]
verification:
  command: "cd ai-service && python -c 'from main import app; print(\"OK\")'"
  expected: "OK"
```

### Phase 4 Completion Gate
```
검증 기준:
- [ ] AI Service import 성공
- [ ] 3개 서비스 생성 (chat, knowledge, escalation)
- [ ] 4개 엔드포인트 생성
- [ ] main.py 정상 로드
```

---

## Phase 5: Frontend - 채팅 UI & 대시보드
> 고객 채팅 위젯과 관리자 대시보드를 구현합니다.

### Parallel Group 5-A: 공통 & 타입

#### T-FE-001
```yaml
id: T-FE-001
type: CREATE
duration: 4 min
agent: frontend-dev
file:
  path: frontend/src/types/chat.ts
  action: create
description: |
  채팅 시스템 타입 정의.
  Conversation, Message, SenderType, ConversationStatus,
  KnowledgeArticle, DashboardStats, SendMessageRequest, etc.
dependencies: []
```

#### T-FE-002
```yaml
id: T-FE-002
type: CREATE
duration: 4 min
agent: frontend-dev
file:
  path: frontend/src/lib/chatApi.ts
  action: create
description: |
  채팅 API 클라이언트.
  고객용: startConversation, sendMessage, getConversation (인증 불필요)
  관리자용: getConversations, getConversationDetail, sendAdminMessage,
  escalate, resolve (인증 필요, 기존 API client 재사용)
dependencies: [T-FE-001]
```

#### T-FE-003
```yaml
id: T-FE-003
type: CREATE
duration: 4 min
agent: frontend-dev
file:
  path: frontend/src/lib/knowledgeApi.ts
  action: create
description: |
  Knowledge Base API 클라이언트.
  CRUD + 검색 (관리자 인증 필요).
dependencies: [T-FE-001]
```

#### T-FE-004
```yaml
id: T-FE-004
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/lib/websocket.ts
  action: create
description: |
  WebSocket 클라이언트 (STOMP over SockJS).
  connect, disconnect, subscribe, send 래퍼.
  자동 재연결 로직 포함.
dependencies: []
```

### Parallel Group 5-B: 고객 채팅 UI

#### T-FE-005
```yaml
id: T-FE-005
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/components/chat/ChatBubble.tsx
  action: create
description: |
  메시지 버블 컴포넌트.
  고객 메시지 (우측, 파란색), AI 메시지 (좌측, 회색), 관리자 메시지 (좌측, 초록색).
  타임스탬프, 아바타 표시.
dependencies: [T-FE-001]
```

#### T-FE-006
```yaml
id: T-FE-006
type: CREATE
duration: 4 min
agent: frontend-dev
file:
  path: frontend/src/components/chat/TypingIndicator.tsx
  action: create
description: |
  AI 타이핑 인디케이터 (점 3개 애니메이션).
  AI가 응답 생성 중일 때 표시.
dependencies: []
```

#### T-FE-007
```yaml
id: T-FE-007
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/components/chat/ChatInput.tsx
  action: create
description: |
  메시지 입력 컴포넌트.
  텍스트 입력 + 전송 버튼. Enter 전송, Shift+Enter 줄바꿈.
  전송 중 disabled 상태.
dependencies: []
```

#### T-FE-008
```yaml
id: T-FE-008
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/hooks/useChatViewModel.ts
  action: create
description: |
  채팅 ViewModel hook (MVVM 패턴).
  상태: messages, isLoading, isConnected, conversation.
  액션: sendMessage, connect, disconnect.
  WebSocket 연동 + REST API fallback.
dependencies: [T-FE-002, T-FE-004]
```

#### T-FE-009
```yaml
id: T-FE-009
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(public)/chat/page.tsx
  action: create
description: |
  고객 채팅 페이지 (Stripe 스타일).
  전체 화면 채팅 레이아웃. 인증 불필요.
  ChatBubble + TypingIndicator + ChatInput 조합.
  세션 기반 대화 유지 (sessionStorage).
dependencies: [T-FE-005, T-FE-006, T-FE-007, T-FE-008]
```

### Parallel Group 5-C: 관리자 대시보드 (병렬 with 5-B)

#### T-FE-010
```yaml
id: T-FE-010
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/hooks/useDashboardViewModel.ts
  action: create (새로 작성, 기존 것 교체)
description: |
  대시보드 ViewModel.
  통계: totalConversations, aiResolutionRate, avgResponseTime, escalationRate.
  TanStack Query로 데이터 페칭.
dependencies: [T-FE-002]
```

#### T-FE-011
```yaml
id: T-FE-011
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/dashboard/page.tsx
  action: create
description: |
  관리자 대시보드 페이지.
  통계 카드 4개 + 최근 대화 목록 + 일별 추이 차트.
dependencies: [T-FE-010]
```

#### T-FE-012
```yaml
id: T-FE-012
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/hooks/useConversationListViewModel.ts
  action: create
description: |
  대화 목록 ViewModel.
  필터: status, dateRange, searchQuery.
  페이지네이션, 정렬.
dependencies: [T-FE-002]
```

#### T-FE-013
```yaml
id: T-FE-013
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/conversations/page.tsx
  action: create
description: |
  대화 목록 페이지.
  테이블: 고객명, 상태, 시작일, 메시지 수, AI해결여부.
  필터 + 검색 + 페이지네이션.
dependencies: [T-FE-012]
```

#### T-FE-014
```yaml
id: T-FE-014
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/conversations/[id]/page.tsx
  action: create
description: |
  대화 상세 페이지.
  채팅 로그 전체 표시 (ChatBubble 재사용).
  관리자 메시지 입력 가능 (AI→사람 전환 버튼).
  에스컬레이션/해결 버튼.
dependencies: [T-FE-005, T-FE-002]
```

#### T-FE-015
```yaml
id: T-FE-015
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/hooks/useKnowledgeViewModel.ts
  action: create
description: |
  Knowledge Base ViewModel.
  CRUD 액션 + 검색.
  TanStack Query mutation.
dependencies: [T-FE-003]
```

#### T-FE-016
```yaml
id: T-FE-016
type: CREATE
duration: 5 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/knowledge/page.tsx
  action: create
description: |
  Knowledge Base 관리 페이지.
  아티클 목록 + 생성/수정 모달.
  카테고리 필터, 검색, 활성/비활성 토글.
dependencies: [T-FE-015]
```

#### T-FE-017
```yaml
id: T-FE-017
type: CREATE
duration: 4 min
agent: frontend-dev
file:
  path: frontend/src/app/(main)/layout.tsx
  action: create
description: |
  관리자 레이아웃 (사이드바 네비게이션).
  메뉴: Dashboard, Conversations, Knowledge Base.
  인증 가드 (useAuth 활용).
dependencies: []
```

### Phase 5 Completion Gate
```
검증 기준:
- [ ] Frontend 컴파일 성공: npx tsc --noEmit
- [ ] 고객 채팅 페이지 접근 가능: /chat
- [ ] 관리자 대시보드 접근 가능: /dashboard
- [ ] 대화 목록/상세 접근 가능: /conversations, /conversations/[id]
- [ ] Knowledge Base 관리 접근 가능: /knowledge
- [ ] WebSocket 연결 코드 구현
```

---

## Phase 6: Integration & Testing
> 전체 시스템 통합 테스트 및 마무리.

### Parallel Group 6-A: Backend Tests

#### T-TEST-001
```yaml
id: T-TEST-001
type: TEST
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-domain/src/test/java/.../conversation/ConversationTest.java
  action: create
description: |
  Conversation 도메인 단위 테스트.
  escalate(), resolve(), close() 상태 전이 테스트.
dependencies: [T-DOM-001]
```

#### T-TEST-002
```yaml
id: T-TEST-002
type: TEST
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-application/src/test/java/.../chat/ChatServiceTest.java
  action: create
description: |
  ChatService 단위 테스트 (mock ports).
  메시지 전송 → AI 응답 → 에스컬레이션 판단 플로우.
dependencies: [T-APP-010]
```

#### T-TEST-003
```yaml
id: T-TEST-003
type: TEST
duration: 5 min
agent: backend-dev
file:
  path: backend/voc-adapter/src/test/java/.../web/chat/ChatControllerTest.java
  action: create
description: |
  ChatController 통합 테스트.
  대화 시작, 메시지 전송 API 테스트.
dependencies: [T-ADAPT-007]
```

### Parallel Group 6-B: AI Service Tests (병렬 with 6-A)

#### T-TEST-004
```yaml
id: T-TEST-004
type: TEST
duration: 5 min
agent: ai-expert
file:
  path: ai-service/tests/test_chat_service.py
  action: create
description: |
  ChatService 단위 테스트.
  응답 생성, confidence 계산, 에스컬레이션 판단.
dependencies: [T-AI-001, T-AI-003]
```

#### T-TEST-005
```yaml
id: T-TEST-005
type: TEST
duration: 5 min
agent: ai-expert
file:
  path: ai-service/tests/test_chat_routes.py
  action: create
description: |
  챗봇 API 엔드포인트 통합 테스트.
  FastAPI TestClient 활용.
dependencies: [T-AI-004]
```

### Parallel Group 6-C: DevOps

#### T-DEVOPS-001
```yaml
id: T-DEVOPS-001
type: MODIFY
duration: 4 min
agent: devops-engineer
file:
  path: docker-compose.yml
  action: modify
description: |
  WebSocket 포트 확인, backend 환경변수 업데이트.
  ESCALATION_CONFIDENCE_THRESHOLD, WEBSOCKET_ALLOWED_ORIGINS 추가.
dependencies: [T-ADAPT-011]
```

### Phase 6 Completion Gate
```
검증 기준:
- [ ] Backend 테스트 통과: ./gradlew test
- [ ] AI Service 테스트 통과: pytest
- [ ] Frontend 빌드 성공: npm run build
- [ ] Docker Compose 설정 유효: docker compose config
```

---

## Parallel Groups Summary

| Group | Tasks | Can Run With | Description |
|-------|-------|-------------|-------------|
| 0-A | T-CLEAN-001~004 | 0-B, 0-C | Backend cleanup |
| 0-B | T-CLEAN-005~006 | 0-A, 0-C | AI Service cleanup |
| 0-C | T-CLEAN-007~009 | 0-A, 0-B | Frontend cleanup |
| 1-A | T-DB-001~003 | 1-B | DB migrations |
| 1-B | T-DOM-001~008 | 1-A | Domain entities |
| 2-A | T-APP-001~005 | 2-B | Chat use cases |
| 2-B | T-APP-006~012 | 2-A | Output ports & knowledge |
| 3-A | T-ADAPT-001~006 | 3-B, 3-C | Persistence adapters |
| 3-B | T-ADAPT-007~010 | 3-A, 3-C | REST controllers |
| 3-C | T-ADAPT-011~015 | 3-A, 3-B | WebSocket, AI adapter, security |
| 4-A | T-AI-001~003 | - | AI core services |
| 4-B | T-AI-004~006 | - (after 4-A) | AI API endpoints |
| 5-A | T-FE-001~004 | 5-B, 5-C | Common types & API clients |
| 5-B | T-FE-005~009 | 5-C (after 5-A) | Customer chat UI |
| 5-C | T-FE-010~017 | 5-B (after 5-A) | Admin dashboard |
| 6-A | T-TEST-001~003 | 6-B, 6-C | Backend tests |
| 6-B | T-TEST-004~005 | 6-A, 6-C | AI tests |
| 6-C | T-DEVOPS-001 | 6-A, 6-B | DevOps config |

## Critical Path
```
T-CLEAN-001~004 → T-DOM-001 → T-APP-002 (SendMessage) → T-APP-010 (ChatService)
  → T-ADAPT-012 (WebSocket Handler) → T-FE-008 (useChatViewModel) → T-FE-009 (Chat Page)
  → T-TEST-002 (ChatService Test)
```

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cleanup 시 재사용 코드 실수로 삭제 | 중간 | 높음 | 삭제 전 git branch 생성, 각 삭제 후 컴파일 확인 |
| WebSocket STOMP 설정 복잡 | 중간 | 중간 | REST API fallback 먼저 구현, WebSocket은 점진적 |
| Ollama 응답 지연 (5-10초) | 높음 | 중간 | 타이핑 인디케이터 + 스트리밍 응답 고려 |
| pgvector 검색 성능 | 낮음 | 중간 | 기존 VectorSearchAdapter 패턴 검증됨 |
| Flyway 마이그레이션 충돌 | 낮음 | 높음 | V15부터 시작, 기존 V1-V14 유지 |
| CORS/WebSocket origin 문제 | 중간 | 낮음 | SecurityConfig에 명시적 허용 |

## Rollback Plan
- Phase 0 시작 전 `feature/ai-chatbot-pivot` 브랜치 생성
- 각 Phase 완료 시 커밋 (rollback point)
- 문제 발생 시 `git revert` 또는 `git reset --hard` to Phase N-1 commit
- 기존 VOC 코드는 main 브랜치에 보존됨

## Estimated Timeline
- **Phase 0** (Cleanup): ~30분
- **Phase 1** (DB + Domain): ~40분
- **Phase 2** (Application): ~50분
- **Phase 3** (Adapter): ~60분
- **Phase 4** (AI Service): ~30분
- **Phase 5** (Frontend): ~70분
- **Phase 6** (Testing): ~30분
- **Total**: ~5시간 (병렬 실행 시 ~3.5시간)

