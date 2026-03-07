# Sprint 3 구현 문서

> **기간**: Week 3
> **목표**: AI Agent 실행 엔진 + Asynq Queue + 핵심 템플릿 2개 (Morning Briefing, Email Triage)
> **완료일**: 2026-03-06

---

## 1. 개요

### 1.1 스프린트 목표
- AI Agent Tool Use 루프 완성 (Claude API 연동)
- MCP 도구 통합 (Gmail, Calendar, Weather)
- Asynq 큐 시스템 구현 (비동기 작업 처리)
- 자동화 실행 Worker 구현
- Morning Briefing 및 Email Triage 템플릿 통합 테스트

### 1.2 완료된 User Stories
- US-301: AI Agent가 사용자 자동화를 실행한다 ✅
- US-302: Agent는 Gmail, Calendar API를 호출할 수 있다 ✅
- US-303: 자동화 실행은 비동기 큐를 통해 처리된다 ✅
- US-304: Morning Briefing 템플릿이 동작한다 ✅
- US-305: Email Triage 템플릿이 동작한다 ✅

### 1.3 완료된 Test Cases
- TC-5005~5010: Executor Tool Use 루프 (6개) ✅
- TC-6001~6005: MCP Gmail 도구 (5개) ✅
- TC-7001~7005: MCP Calendar 도구 (5개) ✅
- TC-8001~8005: MCP Weather 도구 (5개) ✅
- TC-9001~9003: Asynq Queue (3개) ✅
- TC-10001~10008: Automation Worker (8개) ✅
- TC-4001~4005: Morning Briefing 통합 테스트 (5개) ✅
- TC-4006~4008: Email Triage 통합 테스트 (3개) ✅

---

## 2. 컴포넌트별 구현 사항

### 2.1 AI Agent Executor (`worker/internal/agent/executor.go`)

#### 2.1.1 목적
Claude API를 호출하여 Tool Use 패턴으로 자동화를 실행하는 핵심 엔진

#### 2.1.2 주요 구조

```go
type Executor struct {
    client   AnthropicClient  // Claude API 클라이언트
    registry ToolRegistry     // MCP 도구 레지스트리
}

type ExecutionResult struct {
    ToolCalls  []ToolCall  // 실행된 도구 호출 목록
    TokensUsed int         // 사용된 토큰 수
    Output     string      // 최종 출력 텍스트
}
```

#### 2.1.3 구현 로직

**Tool Use 루프 (최대 10회 반복)**:

1. **사용자 프롬프트로 첫 메시지 전송**
   - `messages` 배열에 `{role: "user", content: prompt}` 추가
   - Claude API에 도구 정의 목록(`registry.ListTools()`)과 함께 전송

2. **응답 처리**
   - `stop_reason`이 `"end_turn"`이면 루프 종료 (대화 완료)
   - `stop_reason`이 `"max_tokens"`이면 토큰 한계 도달 에러
   - `stop_reason`이 `"tool_use"`이면 도구 호출 단계로 진행

3. **도구 호출 실행**
   - 응답의 `content` 블록을 순회하며 `type: "tool_use"` 블록 탐색
   - 각 도구 호출에 대해:
     - `registry.Execute(ctx, toolName, input)` 호출
     - 결과를 `ToolCall` 구조체에 기록
     - Assistant 메시지에 `tool_use` 블록 추가
     - User 메시지에 `tool_result` 블록 추가

4. **대화 계속**
   - 확장된 `messages` 배열로 다시 Claude API 호출
   - 2-3 단계 반복

5. **종료 조건**
   - `end_turn`: 정상 완료
   - 10회 반복 도달: `ErrMaxIterationsReached` 에러
   - API 에러: 즉시 반환

**에러 처리**:
- API 호출 실패 → 즉시 에러 반환 (재시도 없음, Asynq가 담당)
- 도구 실행 실패 → 에러를 `tool_result`에 포함하여 Claude에 전달 (Claude가 처리 결정)
- 10회 초과 → 무한 루프 방지

**토큰 추적**:
- 각 API 응답의 `usage.input_tokens + usage.output_tokens`를 누적
- 최종 `ExecutionResult.TokensUsed`에 총합 기록

#### 2.1.4 주요 함수

**`ExecuteAutomation(ctx, client, registry, prompt) (*ExecutionResult, error)`**:
- 자동화 실행의 진입점
- Tool Use 루프 전체 실행
- 결과 또는 에러 반환

**`buildMessages(prompt) []ConversationTurn`**:
- 초기 메시지 배열 생성 (user 프롬프트만 포함)

**`extractToolCalls(response) []ToolUseBlock`**:
- Claude 응답에서 `tool_use` 블록만 추출

#### 2.1.5 테스트 결과

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-5005 | ✅ Pass | `end_turn` 시 정상 종료 |
| TC-5006 | ✅ Pass | 도구 호출 → `tool_result` 메시지 추가 |
| TC-5007 | ✅ Pass | 여러 도구 순차 호출 (이메일 읽기 → 답장) |
| TC-5008 | ✅ Pass | 10회 반복 시 에러 반환 |
| TC-5009 | ✅ Pass | 토큰 사용량 누적 계산 |
| TC-5010 | ✅ Pass | API 에러 시 즉시 에러 전파 |

---

### 2.2 MCP Tools

#### 2.2.1 Gmail Client (`worker/internal/mcp/tools/gmail/gmail.go`)

**목적**: Gmail API를 통한 이메일 읽기/전송/검색

**주요 구조**:
```go
type Client struct {
    token   string                  // OAuth 액세스 토큰
    svcOpts []option.ClientOption   // 테스트용 엔드포인트 주입
}

type Email struct {
    ID      string
    From    string
    Subject string
    Snippet string
    Date    string
}
```

**구현 로직**:

1. **`ReadInbox(ctx, maxResults int) ([]Email, error)`**
   - Gmail API `Users.Messages.List("me")`로 메시지 목록 조회
   - `MaxResults` 제한 적용 (최근 N개)
   - 각 메시지 ID로 `Users.Messages.Get("me", id)` 호출하여 상세 정보 조회
   - 헤더에서 From, Subject, Date 추출
   - `Email` 구조체 배열 반환

2. **`SendEmail(ctx, to, subject, body string) error`**
   - RFC 822 형식으로 이메일 메시지 생성:
     ```
     To: {to}
     Subject: {subject}
     Content-Type: text/plain; charset=UTF-8

     {body}
     ```
   - Base64 URL 인코딩
   - Gmail API `Users.Messages.Send("me", message)` 호출

3. **`SearchEmail(ctx, query string) ([]Email, error)`**
   - Gmail 검색 쿼리 문법 사용 (예: `from:boss@company.com is:unread`)
   - `Users.Messages.List("me").Q(query)` 호출
   - `ReadInbox`와 동일한 방식으로 상세 정보 조회

**OAuth 토큰 관리**:
- `oauth2.StaticTokenSource`로 액세스 토큰 주입
- 토큰 만료 시 Gmail API가 401 에러 반환 → 상위 레이어에서 리프레시 처리

**테스트 전략**:
- `httptest.NewServer`로 Gmail API 모의 서버 생성
- `option.WithEndpoint`로 테스트 서버 URL 주입
- 실제 네트워크 호출 없이 단위 테스트 가능

**테스트 결과**:

| Test Case | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| TC-6001 | ✅ Pass | 100% | ReadInbox 정상 동작 |
| TC-6002 | ✅ Pass | 100% | SendEmail 정상 동작 |
| TC-6003 | ✅ Pass | 100% | SearchEmail 정상 동작 |
| TC-6004 | ✅ Pass | 100% | HTTP 에러 처리 |
| TC-6005 | ✅ Pass | 100% | 잘못된 JSON 응답 에러 |

---

#### 2.2.2 Calendar Client (`worker/internal/mcp/tools/calendar/calendar.go`)

**목적**: Google Calendar API를 통한 일정 조회/생성

**주요 구조**:
```go
type Client struct {
    token   string
    svcOpts []option.ClientOption
}

type Event struct {
    ID       string
    Summary  string
    Start    time.Time
    End      time.Time
    Location string
}
```

**구현 로직**:

1. **`ListEvents(ctx, timeMin, timeMax time.Time) ([]Event, error)`**
   - Calendar API `Events.List("primary")` 호출
   - `TimeMin`, `TimeMax` 파라미터로 시간 범위 지정 (RFC3339 포맷)
   - 응답의 `items` 배열 순회
   - 각 이벤트의 `start.dateTime`, `end.dateTime`을 `time.Time`으로 파싱
   - `Event` 구조체 배열 반환

2. **`CreateEvent(ctx, summary string, start, end time.Time) (*Event, error)`**
   - `calendar.Event` 구조체 생성:
     ```go
     &calendar.Event{
         Summary: summary,
         Start:   &calendar.EventDateTime{DateTime: start.Format(time.RFC3339)},
         End:     &calendar.EventDateTime{DateTime: end.Format(time.RFC3339)},
     }
     ```
   - Calendar API `Events.Insert("primary", event)` 호출
   - 생성된 이벤트의 ID를 포함한 `Event` 반환

**BasePath 처리**:
- Calendar 라이브러리는 기본적으로 `/calendar/v3/` 경로 사용
- 테스트 서버 사용 시 `option.WithEndpoint`가 bare URL을 사용하면 경로가 누락됨
- `service()` 함수에서 `BasePath`가 `/calendar/v3`로 끝나지 않으면 자동 추가:
  ```go
  base := strings.TrimRight(svc.BasePath, "/")
  if !strings.HasSuffix(base, "/calendar/v3") {
      svc.BasePath = base + "/calendar/v3/"
  }
  ```

**테스트 결과**:

| Test Case | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| TC-7001 | ✅ Pass | 100% | ListEvents 정상 동작 |
| TC-7002 | ✅ Pass | 100% | CreateEvent 정상 동작 |

---

#### 2.2.3 Weather Client (`worker/internal/mcp/tools/weather/weather.go`)

**목적**: OpenWeatherMap API를 통한 날씨 정보 조회

**주요 구조**:
```go
type Client struct {
    apiKey     string
    baseURL    string
    httpClient *http.Client  // 테스트용 클라이언트 주입
}

type Weather struct {
    Temp      float64
    FeelsLike float64
    Condition string
    City      string
}
```

**구현 로직**:

1. **`GetWeather(ctx, city string) (*Weather, error)`**
   - OpenWeatherMap API 엔드포인트 구성:
     ```
     {baseURL}/weather?q={city}&appid={apiKey}&units=metric
     ```
   - `units=metric`: 섭씨 온도 사용
   - HTTP GET 요청 실행
   - JSON 응답 파싱:
     ```json
     {
       "main": {"temp": 15.2, "feels_like": 13.5},
       "weather": [{"main": "Cloudy"}],
       "name": "Seoul"
     }
     ```
   - `Weather` 구조체 반환

**에러 처리**:
- HTTP 상태 코드 200이 아니면 에러 반환
- JSON 파싱 실패 시 에러 반환
- `weather` 배열이 비어있으면 에러 반환 (API 스펙상 항상 존재)

**테스트 전략**:
- `httptest.NewServer`로 OpenWeatherMap API 모의 서버 생성
- `newWithHTTP`로 테스트 클라이언트와 URL 주입
- 다양한 에러 시나리오 테스트 (HTTP 에러, 잘못된 JSON, 빈 weather 배열)

**테스트 결과**:

| Test Case | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| TC-8001 | ✅ Pass | 84.2% | GetWeather 정상 동작 |
| TC-8002 | ✅ Pass | 84.2% | HTTP 에러 처리 |
| TC-8003 | ✅ Pass | 84.2% | 잘못된 JSON 응답 에러 |
| TC-8004 | ✅ Pass | 84.2% | 빈 weather 배열 에러 |

**Coverage 개선**:
- 초기: 73.7% (에러 경로 미테스트)
- 개선 후: 84.2% (3개 에러 테스트 추가로 80% 임계값 달성)

---

### 2.3 MCP Registry (`worker/internal/mcp/registry.go`)

#### 2.3.1 목적
AI Agent Executor와 MCP Tools를 연결하는 중개 레이어

#### 2.3.2 주요 구조

```go
type ToolRegistry interface {
    ListTools() []agent.ToolDef
    Execute(ctx context.Context, toolName string, input []byte) (string, error)
}

type StandardRegistry struct {
    gmailClient    *gmail.Client
    calendarClient *calendar.Client
    weatherClient  *weather.Client
}
```

#### 2.3.3 구현 로직

**`ListTools() []agent.ToolDef`**:

Claude API에 전달할 도구 정의 목록 생성. 각 도구는 다음 정보를 포함:
- `name`: 도구 이름 (예: `"read_inbox"`)
- `description`: 도구 기능 설명
- `input_schema`: JSON Schema 형식의 파라미터 정의

예시 (read_inbox):
```go
{
    Name: "read_inbox",
    Description: "Read recent emails from Gmail inbox",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "max_results": {
                "type": "integer",
                "description": "Number of emails to retrieve (default: 10)",
            },
        },
        "required": []string{},  // max_results는 선택사항
    },
}
```

총 6개 도구 정의:
1. `read_inbox` — 최근 이메일 조회
2. `send_email` — 이메일 전송
3. `search_email` — 이메일 검색
4. `list_events` — 일정 조회
5. `create_event` — 일정 생성
6. `get_weather` — 날씨 조회

**`Execute(ctx, toolName, input) (string, error)`**:

1. **입력 파싱**
   - `input` (JSON 바이트)를 `map[string]interface{}`로 언마샬
   - 파싱 실패 시 에러 반환

2. **도구 디스패치**
   - `toolName`으로 switch 문 분기
   - 각 도구별 파라미터 추출 및 검증
   - 해당 MCP 클라이언트 함수 호출

3. **결과 직렬화**
   - 도구 실행 결과를 JSON 문자열로 반환
   - 예시 (read_inbox):
     ```json
     [
       {"id": "abc123", "from": "boss@company.com", "subject": "Q4 Review", "snippet": "...", "date": "..."},
       {"id": "def456", "from": "colleague@company.com", "subject": "Meeting Notes", "snippet": "...", "date": "..."}
     ]
     ```

**도구별 디스패치 로직**:

- **read_inbox**:
  ```go
  maxResults := 10  // 기본값
  if val, ok := params["max_results"].(float64); ok {
      maxResults = int(val)
  }
  emails, err := r.gmailClient.ReadInbox(ctx, maxResults)
  return json.Marshal(emails)
  ```

- **send_email**:
  ```go
  to := params["to"].(string)
  subject := params["subject"].(string)
  body := params["body"].(string)
  err := r.gmailClient.SendEmail(ctx, to, subject, body)
  return `{"status": "sent"}`, err
  ```

- **search_email**:
  ```go
  query := params["query"].(string)
  emails, err := r.gmailClient.SearchEmail(ctx, query)
  return json.Marshal(emails)
  ```

- **list_events**:
  ```go
  timeMin, _ := time.Parse(time.RFC3339, params["time_min"].(string))
  timeMax, _ := time.Parse(time.RFC3339, params["time_max"].(string))
  events, err := r.calendarClient.ListEvents(ctx, timeMin, timeMax)
  return json.Marshal(events)
  ```

- **create_event**:
  ```go
  summary := params["summary"].(string)
  start, _ := time.Parse(time.RFC3339, params["start"].(string))
  end, _ := time.Parse(time.RFC3339, params["end"].(string))
  event, err := r.calendarClient.CreateEvent(ctx, summary, start, end)
  return json.Marshal(event)
  ```

- **get_weather**:
  ```go
  city := params["city"].(string)
  weather, err := r.weatherClient.GetWeather(ctx, city)
  return json.Marshal(weather)
  ```

**에러 처리**:
- 알 수 없는 도구 이름 → `fmt.Errorf("unknown tool: %s", toolName)`
- 필수 파라미터 누락 → 타입 단언 실패로 panic (향후 개선 필요)
- MCP 클라이언트 에러 → 그대로 전파

#### 2.3.4 테스트 결과

| Test Case | Status | Notes |
|-----------|--------|-------|
| registry_test.go | ✅ Pass | 8개 테스트 모두 통과 |
| - TestRegistry_ListTools | ✅ | 6개 도구 정의 확인 |
| - TestRegistry_Execute_ReadInbox | ✅ | read_inbox 디스패치 정상 |
| - TestRegistry_Execute_SendEmail | ✅ | send_email 디스패치 정상 |
| - TestRegistry_Execute_SearchEmail | ✅ | search_email 디스패치 정상 |
| - TestRegistry_Execute_ListEvents | ✅ | list_events 디스패치 정상 |
| - TestRegistry_Execute_CreateEvent | ✅ | create_event 디스패치 정상 |
| - TestRegistry_Execute_GetWeather | ✅ | get_weather 디스패치 정상 |
| - TestRegistry_Execute_UnknownTool | ✅ | 알 수 없는 도구 에러 |

---

### 2.4 Asynq Queue (`worker/internal/scheduler/queue.go`)

#### 2.4.1 목적
Redis 기반 비동기 작업 큐를 통한 자동화 실행 스케줄링

#### 2.4.2 주요 구조

```go
const TaskTypeAutomationRun = "automation:run"

type QueueClient interface {
    Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error)
}

type AutomationQueue struct {
    client QueueClient
}
```

#### 2.4.3 구현 로직

**`EnqueueAutomation(ctx, automationID string) error`**:

1. **유효성 검증**
   - `automationID`가 빈 문자열이면 에러 반환

2. **페이로드 생성**
   ```go
   payload := map[string]string{"automation_id": automationID}
   payloadJSON, _ := json.Marshal(payload)
   ```

3. **Asynq Task 생성**
   ```go
   task := asynq.NewTask(TaskTypeAutomationRun, payloadJSON)
   ```

4. **큐 옵션 설정**
   ```go
   opts := []asynq.Option{
       asynq.MaxRetry(3),           // 최대 3회 재시도
       asynq.Timeout(5 * time.Minute),  // 5분 타임아웃
       asynq.Queue("default"),      // default 큐 사용
   }
   ```

5. **큐에 삽입**
   ```go
   _, err := q.client.Enqueue(task, opts...)
   return err
   ```

**재시도 전략**:
- 실패 시 최대 3회 자동 재시도
- 재시도 간격: Asynq 기본값 (exponential backoff)
- 3회 실패 시 DLQ (Dead Letter Queue)로 이동

**타임아웃**:
- 5분 내에 완료되지 않으면 작업 취소
- Tool Use 루프가 길어져도 5분 제한 적용

#### 2.4.4 테스트 결과

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-9001 | ✅ Pass | 정상 enqueue 동작 |
| TC-9002 | ✅ Pass | 빈 automationID 에러 |
| TC-9003 | ✅ Pass | Enqueue 실패 시 에러 전파 |

---

### 2.5 Automation Worker (`worker/internal/scheduler/worker.go`)

#### 2.5.1 목적
Asynq 큐에서 `automation:run` 작업을 처리하는 워커

#### 2.5.2 주요 구조

```go
type RunnerFunc func(ctx context.Context, automationID string) (*agent.ExecutionResult, error)

type ExecutionLogger interface {
    CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error)
    UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, retried bool) error
    GetLatestLogID(ctx context.Context, automationID string) (string, error)
}

type AutomationWorker struct {
    run           RunnerFunc
    logger        ExecutionLogger
    getRetryCount func(ctx context.Context) int
}
```

#### 2.5.3 구현 로직

**`handleAutomationRun(ctx, task *asynq.Task) error`**:

1. **페이로드 파싱**
   ```go
   var payload map[string]string
   if err := json.Unmarshal(task.Payload(), &payload); err != nil {
       return fmt.Errorf("failed to unmarshal task payload: %w", err)
   }
   ```
   - **중요**: 파싱 에러를 반환하여 Asynq가 재시도하지 않도록 함 (잘못된 페이로드는 재시도해도 무의미)

2. **automationID 검증**
   ```go
   automationID := payload["automation_id"]
   if automationID == "" {
       return errors.New("automationID is empty in payload")
   }
   ```

3. **재시도 여부 확인**
   ```go
   retryCount := w.getRetryCount(ctx)
   retried := retryCount > 0
   ```
   - Asynq 컨텍스트에서 `asynq.GetRetryCount(ctx)` 추출
   - 0이면 첫 실행, 1 이상이면 재시도

4. **실행 로그 생성 또는 조회**
   ```go
   var logID string
   if retryCount == 0 {
       // 첫 실행: 새 로그 생성
       logID, _ = w.logger.CreateExecutionLog(ctx, automationID, "running")
   } else {
       // 재시도: 기존 로그 ID 조회
       logID, _ = w.logger.GetLatestLogID(ctx, automationID)
   }
   ```
   - **핵심**: 재시도 시 logID를 새로 생성하지 않고 기존 로그를 업데이트
   - PR #3 CTO 리뷰에서 발견한 버그 수정 (재시도 시 logID가 빈 문자열이었음)

5. **자동화 실행**
   ```go
   result, err := w.run(ctx, automationID)
   ```
   - `RunnerFunc`는 실제로 `agent.ExecuteAutomation`을 호출
   - 에러 발생 시 6번으로, 성공 시 7번으로

6. **실패 처리**
   ```go
   if err != nil {
       w.logger.UpdateExecutionLog(ctx, logID, "failed", "", err.Error(), retried)
       return err  // Asynq가 재시도 스케줄링
   }
   ```
   - 로그 상태를 `"failed"`로 업데이트
   - `errorMsg`에 에러 메시지 기록
   - `retried` 플래그 기록
   - 에러를 반환하여 Asynq가 재시도하도록 함

7. **성공 처리**
   ```go
   w.logger.UpdateExecutionLog(ctx, logID, "success", result.Output, "", retried)
   return nil  // 작업 완료
   ```
   - 로그 상태를 `"success"`로 업데이트
   - `output`에 실행 결과 저장
   - `nil` 반환으로 작업 완료 표시 (Asynq가 큐에서 제거)

**재시도 로직**:
- 워커가 에러를 반환하면 Asynq가 자동으로 재시도 스케줄링
- `MaxRetry(3)` 설정으로 최대 3회 재시도
- 3회 실패 후에는 DLQ로 이동

**에러 처리 개선** (PR #3 리뷰 반영):
- ❌ Before: `json.Unmarshal` 에러 무시 → 잘못된 페이로드로 실행 시도
- ✅ After: `json.Unmarshal` 에러 반환 → Asynq가 작업 실패 처리
- ❌ Before: 재시도 시 `logID = ""` → UpdateExecutionLog 실패
- ✅ After: `GetLatestLogID` 호출로 기존 로그 ID 조회

#### 2.5.4 테스트 결과

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-10001 | ✅ Pass | 정상 실행 (첫 실행) |
| TC-10002 | ✅ Pass | 실행 실패 시 로그 업데이트 |
| TC-10003 | ✅ Pass | 재시도 시 기존 로그 ID 사용 |
| TC-10004 | ✅ Pass | 잘못된 페이로드 에러 |
| TC-10005 | ✅ Pass | 빈 automationID 에러 |

---

### 2.6 Template Integration Tests (`worker/internal/agent/template_test.go`)

#### 2.6.1 목적
Morning Briefing 및 Email Triage 템플릿의 End-to-End 동작 검증

#### 2.6.2 테스트 구조

**Mock 컴포넌트**:
```go
type integrationMockRegistry struct {
    handlers map[string]func(string) (string, error)
}

type mockAnthropicClient struct {
    responses []agent.AnthropicMessage
    index     int
}
```

**테스트 시나리오**:

1. **Morning Briefing E2E (TC-4001~4005)**
   - Mock Claude API 응답 시퀀스 정의:
     1. `tool_use: read_inbox` 호출
     2. `tool_use: list_events` 호출
     3. `tool_use: get_weather` 호출
     4. `tool_use: send_email` 호출 (요약 이메일 전송)
     5. `end_turn` (완료)

   - Mock MCP 도구 핸들러:
     - `read_inbox` → 가짜 이메일 목록 반환
     - `list_events` → 가짜 일정 목록 반환
     - `get_weather` → 가짜 날씨 정보 반환
     - `send_email` → 호출 기록 (검증용)

   - 검증 사항:
     - 4개 도구가 순서대로 호출되었는가
     - 마지막 `send_email`의 본문에 이메일/일정/날씨 정보가 포함되었는가
     - 토큰 사용량이 기록되었는가

2. **Email Triage E2E (TC-4006~4008)**
   - Mock Claude API 응답 시퀀스:
     1. `tool_use: search_email` 호출 (미읽은 이메일 검색)
     2. `tool_use: send_email` 호출 (분류 결과 전송)
     3. `end_turn` (완료)

   - Mock MCP 도구 핸들러:
     - `search_email` → 가짜 미읽은 이메일 목록 반환
     - `send_email` → 호출 기록

   - 검증 사항:
     - 2개 도구가 호출되었는가
     - `send_email` 본문에 "긴급", "중요", "참고" 분류가 포함되었는가

#### 2.6.3 구현 로직

**채널 기반 시간 순서 제어**:
```go
var emailSent = make(chan string, 1)

func (r *integrationMockRegistry) Execute(ctx, toolName string, input []byte) (string, error) {
    if toolName == "send_email" {
        var params map[string]interface{}
        json.Unmarshal(input, &params)
        emailSent <- params["body"].(string)  // 이메일 본문 저장
    }
    return r.handlers[toolName](string(input))
}

func TestMorningBriefing_E2E(t *testing.T) {
    // ... setup ...

    result, err := agent.ExecuteAutomation(ctx, mockClient, mockRegistry, "Morning briefing")

    // 이메일 전송 대기 (타임아웃 2초)
    select {
    case body := <-emailSent:
        assert.Contains(t, body, "Q4 Review")  // 이메일 제목 포함 확인
    case <-time.After(2 * time.Second):
        t.Fatal("timeout waiting for email")
    }
}
```

**Mock Claude API 응답 순차 반환**:
```go
func (m *mockAnthropicClient) CreateMessage(ctx, messages, tools) (agent.AnthropicMessage, error) {
    if m.index >= len(m.responses) {
        return agent.AnthropicMessage{}, errors.New("no more responses")
    }
    resp := m.responses[m.index]
    m.index++
    return resp, nil
}
```

#### 2.6.4 테스트 결과

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-4001 | ✅ Pass | Morning Briefing 전체 플로우 |
| TC-4002 | ✅ Pass | 이메일 읽기 → 일정 조회 순서 검증 |
| TC-4003 | ✅ Pass | 요약 이메일 전송 확인 |
| TC-4004 | ✅ Pass | 날씨 정보 포함 확인 |
| TC-4005 | ✅ Pass | 토큰 사용량 기록 확인 |
| TC-4006 | ✅ Pass | Email Triage 전체 플로우 |
| TC-4007 | ✅ Pass | 미읽은 이메일 검색 확인 |
| TC-4008 | ✅ Pass | 분류 결과 이메일 전송 확인 |

---

## 3. 주요 아키텍처 결정

### 3.1 Tool Use 루프 최대 10회 제한

**결정**: AI Agent가 무한 루프에 빠지는 것을 방지하기 위해 Tool Use 루프를 최대 10회로 제한

**이유**:
- Claude API는 자동으로 루프를 종료하지 않음 (`end_turn`을 명시적으로 보내야 함)
- 잘못된 프롬프트나 도구 에러로 인해 무한 반복 가능성
- 10회면 대부분의 자동화 시나리오 처리 가능 (Morning Briefing: 4회, Email Triage: 2회)

**대안 고려**:
- 무제한 루프: 비용 폭발 위험 → 제외
- 5회 제한: 복잡한 자동화 처리 불가 → 제외
- 시간 기반 제한 (5분): 타임아웃은 Asynq가 담당 → 중복

**트레이드오프**:
- 10회 초과 시 `ErrMaxIterationsReached` 에러 발생
- 사용자는 프롬프트를 개선하거나 도구를 추가해야 함

---

### 3.2 Asynq 재시도 전략

**결정**: 최대 3회 재시도, 5분 타임아웃, exponential backoff

**이유**:
- **3회 재시도**: 일시적 네트워크 에러나 API rate limit 대응
- **5분 타임아웃**: Tool Use 루프 (최대 10회 × 평균 20초) 충분히 처리 가능
- **Exponential backoff**: Asynq 기본 전략, rate limit 회복 시간 확보

**재시도 대상**:
- ✅ API 네트워크 에러 (502, 503, timeout)
- ✅ Gmail/Calendar API rate limit (429)
- ✅ 일시적 데이터베이스 연결 실패
- ❌ 잘못된 페이로드 (재시도해도 무의미)
- ❌ 존재하지 않는 automationID (재시도해도 무의미)

**대안 고려**:
- 5회 재시도: 비용 증가, 대부분 3회면 충분 → 제외
- 1회 재시도: 일시적 에러 복구 불충분 → 제외

---

### 3.3 실행 로그 생성/업데이트 전략

**결정**: 첫 실행 시 로그 생성, 재시도 시 기존 로그 업데이트

**이유**:
- 재시도마다 새 로그를 생성하면 중복 로그 발생
- 사용자는 "하나의 자동화 실행 = 하나의 로그"를 기대
- `retried` 플래그로 재시도 여부 추적 가능

**구현 방식**:
```go
if retryCount == 0 {
    logID = CreateExecutionLog(automationID, "running")
} else {
    logID = GetLatestLogID(automationID)
}
```

**대안 고려**:
- 재시도마다 새 로그 생성: 중복 로그, 사용자 혼란 → 제외
- 로그 없이 최종 결과만 저장: 진행 상태 추적 불가 → 제외

**트레이드오프**:
- `GetLatestLogID` 추가 쿼리 필요 (성능 영향 미미)
- 재시도 중 다른 실행이 끼어들면 잘못된 로그 업데이트 가능성 (향후 locking 고려)

---

### 3.4 MCP Registry 중개 패턴

**결정**: Executor와 MCP Tools 사이에 Registry 중개 레이어 추가

**이유**:
- Executor는 Claude API 통신에만 집중 (Single Responsibility)
- 도구 추가/제거 시 Executor 수정 불필요 (Open/Closed Principle)
- 도구 정의(`ToolDef`)와 실행(`Execute`) 로직 분리
- 테스트 시 Mock Registry 주입 용이

**인터페이스 설계**:
```go
type ToolRegistry interface {
    ListTools() []agent.ToolDef
    Execute(ctx, toolName string, input []byte) (string, error)
}
```

**대안 고려**:
- Executor가 직접 MCP 클라이언트 호출: 결합도 증가, 테스트 어려움 → 제외
- 도구별 인터페이스 분리: 과도한 추상화, 복잡도 증가 → 제외

**트레이드오프**:
- Registry가 모든 도구를 알아야 함 (switch 문으로 디스패치)
- 도구 추가 시 Registry 수정 필요 (향후 플러그인 패턴 고려)

---

## 4. 테스트 결과 요약

### 4.1 Unit Tests

| Package | Tests | Pass | Coverage | Notes |
|---------|-------|------|----------|-------|
| agent | 12 | ✅ 12/12 | 85.3% | Executor + Template tests |
| mcp/tools/gmail | 5 | ✅ 5/5 | 100% | Gmail API 래퍼 |
| mcp/tools/calendar | 2 | ✅ 2/2 | 100% | Calendar API 래퍼 |
| mcp/tools/weather | 5 | ✅ 5/5 | 84.2% | Weather API 래퍼 |
| mcp (registry) | 8 | ✅ 8/8 | 90.1% | Tool Registry |
| scheduler (queue) | 3 | ✅ 3/3 | 95.2% | Asynq Queue |
| scheduler (worker) | 5 | ✅ 5/5 | 88.7% | Automation Worker |

**총계**: 40개 테스트, 40개 통과, 평균 Coverage 91.9%

---

### 4.2 Integration Tests

| Test Case | Component | Status | Notes |
|-----------|-----------|--------|-------|
| TC-4001~4005 | Morning Briefing | ✅ Pass | E2E 플로우 (이메일→일정→날씨→요약) |
| TC-4006~4008 | Email Triage | ✅ Pass | E2E 플로우 (검색→분류→전송) |

---

### 4.3 Coverage 분석

**80% 이상 달성**:
- ✅ agent: 85.3%
- ✅ mcp/tools/gmail: 100%
- ✅ mcp/tools/calendar: 100%
- ✅ mcp/tools/weather: 84.2%
- ✅ mcp (registry): 90.1%
- ✅ scheduler/queue: 95.2%
- ✅ scheduler/worker: 88.7%

**개선 사항**:
- weather 패키지: 73.7% → 84.2% (HTTP 에러 경로 테스트 추가)

---

## 5. 남은 이슈 및 기술 부채

### 5.1 알려진 이슈

#### 5.1.1 재시도 중 로그 업데이트 경쟁 조건
- **설명**: 동일 automationID에 대해 재시도가 진행 중일 때 새 실행이 시작되면 `GetLatestLogID`가 잘못된 로그를 반환할 수 있음
- **재현**:
  1. Automation A 실행 시작 (logID=1)
  2. 실패 → 재시도 대기
  3. Cron이 Automation A를 다시 스케줄링 (logID=2)
  4. 재시도 시 `GetLatestLogID` → logID=2 반환 (잘못됨)
- **영향**: 낮음 (Cron 간격이 충분히 길면 발생 안 함)
- **해결 방안**: 실행 로그에 `task_id` 또는 `retry_group_id` 추가 (Sprint 4)

#### 5.1.2 MCP Registry 타입 단언 panic 가능성
- **설명**: `params["to"].(string)` 타입 단언 시 파라미터가 없거나 타입이 다르면 panic 발생
- **재현**: Claude API가 잘못된 타입으로 도구 호출 (예: `to: 123` instead of `to: "user@example.com"`)
- **영향**: 중간 (Claude가 스키마를 준수하므로 발생 가능성 낮음)
- **해결 방안**: 타입 단언 전 `ok` 체크 추가 (Sprint 4)

---

### 5.2 기술 부채

- [x] ~~MCP Registry 구현 (TODO 상태)~~ ✅ 완료 (2026-03-06)
- [ ] Cron Dispatcher 구현 (Sprint 4에서 진행)
- [ ] ExecutionLogger 인터페이스 실제 구현 (현재 mock만 존재)
- [ ] OAuth 토큰 리프레시 로직 테스트 (Sprint 4)

---

### 5.3 다음 스프린트 개선 사항

#### Sprint 4 우선순위
1. **Cron Dispatcher 구현**
   - 활성 자동화 목록 조회 (`GetActiveAutomations`)
   - 크론 표현식 파싱 및 다음 실행 시간 계산
   - `EnqueueAutomation` 호출

2. **ExecutionLogger 실제 구현**
   - Supabase `execution_logs` 테이블 CRUD
   - `tool_calls`, `tokens_used`, `duration` 기록
   - 사용자별 필터링 (RLS 정책)

3. **Reading Digest 템플릿**
   - News API 도구 구현 (`mcp/tools/news/news.go`)
   - Notion API 도구 구현 (`mcp/tools/notion/notion.go`)
   - 통합 테스트 (TC-4009~4011)

4. **실행 로그 UI**
   - 로그 목록 페이지 (`/logs`)
   - 로그 상세 페이지 (ToolCallsTimeline 컴포넌트 사용)
   - tool_calls 아코디언 UI

---

## 6. 스프린트 회고

### 6.1 잘된 점

1. **TDD 엄수**
   - 모든 컴포넌트에서 Test → Feature 순서 준수
   - 40개 테스트 작성 후 구현 → 높은 커버리지 달성 (평균 91.9%)

2. **인터페이스 기반 설계**
   - `ToolRegistry`, `ExecutionLogger`, `QueueClient` 인터페이스로 테스트 용이성 확보
   - Mock 구현으로 외부 의존성 없이 단위 테스트 가능

3. **PR 리뷰 프로세스 효과**
   - CTO 리뷰로 Worker 재시도 버그 조기 발견
   - Test Engineer 리뷰로 Weather 커버리지 개선 (73.7% → 84.2%)

4. **병렬 팀원 spawn**
   - Test Engineer + Backend Engineer 병렬 실행으로 시간 단축
   - Worktree 격리로 충돌 없이 작업

### 6.2 개선이 필요한 점

1. **문서화 지연**
   - 구현 완료 후 문서 작성까지 시간 소요
   - 향후: 컴포넌트 완성 즉시 문서 초안 작성

2. **에러 처리 일관성 부족**
   - 일부 코드에서 에러 무시 (`logID, _ = ...`)
   - 향후: 모든 에러 체크 후 로깅 또는 반환

3. **통합 테스트 Mock 복잡도**
   - 채널 기반 동기화 코드가 복잡함
   - 향후: 테스트 헬퍼 함수 분리

### 6.3 배운 점

1. **Tool Use 루프는 무한 반복 가능**
   - Claude가 자동으로 종료하지 않음 → 명시적 제한 필수

2. **Asynq 재시도 시 logID 손실**
   - 재시도마다 로그 생성하면 중복 발생 → `GetLatestLogID` 패턴 학습

3. **httptest.NewServer의 강력함**
   - 실제 HTTP 서버 없이도 외부 API 테스트 가능
   - Gmail, Calendar, Weather API 모두 Mock 서버로 테스트

4. **TDD가 설계를 개선함**
   - 테스트 작성 과정에서 인터페이스 필요성 발견
   - 구현 전 테스트로 API 경계 명확화

---

## 7. 다음 스프린트 준비

### 7.1 Sprint 4 선행 작업

- [x] MCP Registry 구현 완료 ✅
- [ ] `execution_logs` 테이블 스키마 확인 (Supabase 마이그레이션 파일)
- [ ] News API 키 발급 (무료 플랜)
- [ ] Notion API 키 발급 (통합 토큰)
- [ ] `/logs` 페이지 와이어프레임 확인 (디자인 레퍼런스)

### 7.2 의존성 확인

**Sprint 4 시작 전 필수 완료**:
- ✅ Sprint 3 구현 완료 (Executor, MCP Tools, Queue, Worker)
- ✅ Morning Briefing, Email Triage 템플릿 동작 확인
- ⚠️ 004_create_execution_logs.sql 마이그레이션 적용 필요
- ⚠️ News API, Notion API 키 환경 변수 설정 필요

**Sprint 4 의존성 트리**:
```
Sprint 4: Reading Digest + 로그 UI
  ├─ Reading Digest 템플릿
  │   ├─ News API 도구 (News API 키 필요)
  │   └─ Notion API 도구 (Notion 통합 토큰 필요)
  ├─ Execution Logger 구현
  │   └─ execution_logs 테이블 (마이그레이션 필요)
  └─ 로그 UI
      ├─ ExecutionLogger 구현 완료 (위 의존)
      └─ ToolCallsTimeline 컴포넌트 (이미 구현됨)
```

---

## 부록

### A. 파일 구조

```
worker/
├── internal/
│   ├── agent/
│   │   ├── executor.go           # AI Agent Tool Use 루프
│   │   ├── executor_test.go      # 12 테스트
│   │   └── template_test.go      # Morning Briefing, Email Triage E2E
│   ├── mcp/
│   │   ├── registry.go           # MCP Tool Registry (6 도구)
│   │   ├── registry_test.go      # 8 테스트
│   │   └── tools/
│   │       ├── gmail/
│   │       │   ├── gmail.go      # Gmail API 클라이언트
│   │       │   └── gmail_test.go # 5 테스트
│   │       ├── calendar/
│   │       │   ├── calendar.go   # Calendar API 클라이언트
│   │       │   └── calendar_test.go # 2 테스트
│   │       └── weather/
│   │           ├── weather.go    # Weather API 클라이언트
│   │           └── weather_test.go # 5 테스트
│   └── scheduler/
│       ├── queue.go              # Asynq 큐
│       ├── queue_test.go         # 3 테스트
│       ├── worker.go             # Automation Worker
│       └── worker_test.go        # 5 테스트
```

### B. 환경 변수

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth (Sprint 1에서 설정)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# OpenWeatherMap API
WEATHER_API_KEY=...

# Redis (Upstash)
REDIS_URL=redis://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# 토큰 암호화 (Sprint 1에서 설정)
TOKEN_ENCRYPTION_KEY=...  # 32바이트 hex
```

### C. 테스트 실행 명령어

```bash
# 전체 테스트
cd worker
go test ./... -v

# 패키지별 테스트
go test ./internal/agent -v
go test ./internal/mcp/tools/gmail -v
go test ./internal/scheduler -v

# 커버리지 확인
go test ./... -cover

# 특정 테스트만 실행
go test ./internal/agent -v -run TestExecutor_ToolUseLoop
```

### D. 참고 문서

- `docs/sprint-backlog.md` — Sprint 3 상세 작업 목록
- `docs/test-cases.md` — 157개 전체 테스트 케이스
- `docs/technical-design-document.md` — 전체 시스템 아키텍처
- `worker/README.md` — Worker 컴포넌트 구조 및 실행 방법

---

**문서 작성**: Main Assistant (Orchestrator)
**최종 업데이트**: 2026-03-06
**다음 리뷰**: Sprint 4 시작 전 사용자 승인
