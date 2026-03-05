# AI Personal Autopilot — 기술 설계서 (Go Edition)

---

## 1. 시스템 아키텍처 Overview

프론트엔드(Next.js)와 백엔드 워커(Go)를 분리한 **이중 서비스 아키텍처**입니다.
Next.js는 UI, 인증, CRUD API를 담당하고, Go 워커가 MCP 서버, AI 에이전트, 스케줄러를 담당합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Next.js 15)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Landing     │  │  Dashboard   │  │  Settings          │    │
│  │  Page        │  │  (자동화/로그)│  │  (BYOK, 연결관리)   │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                           │                                     │
│              Supabase Auth + REST API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Auth Routes │  │  Automation  │  │  Webhook           │    │
│  │  (OAuth)     │  │  CRUD API    │  │  Receiver → Redis  │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                    Vercel 배포                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ Redis (Upstash)
                             │ Supabase (PostgreSQL)
┌────────────────────────────▼────────────────────────────────────┐
│                    WORKER LAYER (Go)                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Scheduler   │  │  Job Queue   │  │  Agent Executor    │    │
│  │  (Cron)      │──▶  (Asynq)     │──▶  (LLM + Tool Use) │    │
│  └──────────────┘  └──────────────┘  └─────────┬──────────┘    │
│                                                  │               │
│  ┌───────────────────────────────────────────────▼─────────┐    │
│  │              MCP Integration Layer                       │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │    │
│  │  │ Gmail  │ │Calendar│ │ Notion │ │ News │ │Weather │  │    │
│  │  └────────┘ └────────┘ └────────┘ └──────┘ └────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                    Fly.io / Railway 배포                         │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │  Supabase        │  │  Upstash     │  │  Vault         │    │
│  │  (PostgreSQL)    │  │  (Redis)     │  │  (토큰 암호화)  │    │
│  └──────────────────┘  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 왜 Go + Next.js 이중 구조인가?

| 고려사항 | Next.js 단독 | Go + Next.js |
|----------|-------------|--------------|
| 프론트엔드 | ✅ React SSR | ✅ React SSR |
| 장시간 백그라운드 잡 | ❌ Vercel 함수 제한 (10~60초) | ✅ 제한 없음 |
| 동시성 | ❌ 단일 스레드 (Node.js) | ✅ goroutine 네이티브 |
| MCP 서버 성능 | ⚠️ 보통 | ✅ 단일 바이너리, 빠른 시작 |
| 메모리 효율 | ⚠️ Node.js 오버헤드 | ✅ 낮은 메모리 사용 |
| 배포 | Vercel만 | Vercel + Fly.io/Railway |

---

## 2. Database 스키마 (Supabase PostgreSQL)

> DB 스키마, RLS 정책, 인덱스는 이전 설계와 동일합니다.
> Go 워커는 Supabase service_role 키로 직접 PostgreSQL에 접근합니다.

```sql
-- ============================================
-- 사용자 프로필 (Supabase Auth 확장)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  preferred_language TEXT DEFAULT 'en',
  llm_provider TEXT DEFAULT 'managed',        -- 'managed' | 'byok'
  llm_api_key_encrypted TEXT,                  -- BYOK 시 암호화된 API 키
  llm_model TEXT DEFAULT 'claude-sonnet-4-5',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 연결된 서비스 (OAuth 토큰 관리)
-- ============================================
CREATE TABLE public.connected_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- 자동화 규칙
-- ============================================
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id TEXT,
  icon TEXT DEFAULT '⚡',
  trigger_type TEXT NOT NULL,             -- 'cron' | 'webhook' | 'on_demand'
  trigger_config JSONB NOT NULL,
  agent_prompt TEXT NOT NULL,
  agent_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 실행 로그
-- ============================================
CREATE TABLE public.execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  trigger_data JSONB,
  steps JSONB[],
  result_summary TEXT,
  output_data JSONB,
  llm_tokens_used INTEGER DEFAULT 0,
  llm_cost_usd NUMERIC(10,6) DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 사용자 선호도 / 개인화 데이터
-- ============================================
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  learned_from TEXT,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

-- ============================================
-- 사용량 추적
-- ============================================
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  executions_count INTEGER DEFAULT 0,
  llm_tokens_total INTEGER DEFAULT 0,
  llm_cost_total NUMERIC(10,4) DEFAULT 0,
  UNIQUE(user_id, period_start)
);

-- RLS + 인덱스 (이전과 동일)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_services" ON public.connected_services FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_automations" ON public.automations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_logs" ON public.execution_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_usage" ON public.usage_tracking FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_automations_next_run ON public.automations(next_run_at) WHERE status = 'active' AND trigger_type = 'cron';
CREATE INDEX idx_automations_user ON public.automations(user_id);
CREATE INDEX idx_execution_logs_automation ON public.execution_logs(automation_id, created_at DESC);
CREATE INDEX idx_connected_services_user_provider ON public.connected_services(user_id, provider);
```

---

## 3. Go 워커 서비스 아키텍처

### 3.1 핵심 의존성

```go
// go.mod
module github.com/allen/autopilot-worker

go 1.23

require (
    // MCP SDK
    github.com/mark3labs/mcp-go v0.27.0

    // Job Queue (Redis 기반, Go 네이티브)
    github.com/hibiken/asynq v0.25.1

    // Database
    github.com/jackc/pgx/v5 v5.7.0
    github.com/supabase-community/supabase-go v0.1.0

    // HTTP
    github.com/go-chi/chi/v5 v5.1.0

    // LLM API (Anthropic)
    github.com/anthropics/anthropic-sdk-go v0.2.0

    // Google APIs
    google.golang.org/api v0.210.0
    golang.org/x/oauth2 v0.24.0

    // Utils
    github.com/redis/go-redis/v9 v9.7.0
    github.com/robfig/cron/v3 v3.0.1
    github.com/rs/zerolog v1.33.0
    github.com/joho/godotenv v1.5.1
)
```

### 3.2 Go 워커 내부 구조

```
┌─────────────────────────────────────────────────┐
│                Go Worker Process                 │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  main.go                                │    │
│  │  - Config 로드                           │    │
│  │  - DB 커넥션 풀 초기화                    │    │
│  │  - Redis 연결                            │    │
│  │  - Asynq Worker 시작                     │    │
│  │  - Cron Scheduler 시작                   │    │
│  │  - Webhook HTTP 서버 시작 (optional)      │    │
│  │  - Graceful shutdown 처리                │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ Cron     │ │ Asynq    │ │ Agent        │    │
│  │ Ticker   │→│ Queue    │→│ Executor     │    │
│  │          │ │ Consumer │ │ (goroutine)  │    │
│  └──────────┘ └──────────┘ └──────┬───────┘    │
│                                    │             │
│  ┌─────────────────────────────────▼──────┐     │
│  │         MCP Tool Registry              │     │
│  │  map[string]ToolHandler                │     │
│  │  - gmail.ListEmails                    │     │
│  │  - gmail.SendEmail                     │     │
│  │  - calendar.ListEvents                 │     │
│  │  - notion.CreatePage                   │     │
│  │  - news.GetHeadlines                   │     │
│  │  - weather.GetCurrent                  │     │
│  └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 4. MCP 서버 구현 (Go)

### 4.1 MCP Tool 인터페이스

```go
// internal/mcp/tool.go
package mcp

import "context"

// Tool은 모든 MCP 도구가 구현해야 하는 인터페이스
type Tool struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"input_schema"`
    Handler     ToolHandler
}

// ToolHandler는 도구 실행 함수 시그니처
type ToolHandler func(ctx context.Context, params map[string]interface{}) (string, error)

// ToolRegistry는 사용 가능한 도구를 관리
type ToolRegistry struct {
    tools map[string]*Tool
}

func NewToolRegistry() *ToolRegistry {
    return &ToolRegistry{tools: make(map[string]*Tool)}
}

func (r *ToolRegistry) Register(tool *Tool) {
    r.tools[tool.Name] = tool
}

func (r *ToolRegistry) Get(name string) (*Tool, bool) {
    t, ok := r.tools[name]
    return t, ok
}

// GetToolDefinitions returns tools in Anthropic API format
func (r *ToolRegistry) GetToolDefinitions() []map[string]interface{} {
    defs := make([]map[string]interface{}, 0, len(r.tools))
    for _, t := range r.tools {
        defs = append(defs, map[string]interface{}{
            "name":         t.Name,
            "description":  t.Description,
            "input_schema": t.InputSchema,
        })
    }
    return defs
}

func (r *ToolRegistry) Execute(ctx context.Context, name string, params map[string]interface{}) (string, error) {
    tool, ok := r.tools[name]
    if !ok {
        return "", fmt.Errorf("unknown tool: %s", name)
    }
    return tool.Handler(ctx, params)
}
```

### 4.2 Gmail MCP 도구 (Go)

```go
// internal/mcp/tools/gmail/gmail.go
package gmail

import (
    "context"
    "encoding/base64"
    "encoding/json"
    "fmt"

    "google.golang.org/api/gmail/v1"
    "google.golang.org/api/option"
    "golang.org/x/oauth2"

    mcptool "github.com/allen/autopilot-worker/internal/mcp"
)

// NewGmailTools creates Gmail MCP tools with the user's OAuth token
func NewGmailTools(accessToken string) ([]*mcptool.Tool, error) {
    tokenSource := oauth2.StaticTokenSource(&oauth2.Token{
        AccessToken: accessToken,
    })

    svc, err := gmail.NewService(context.Background(),
        option.WithTokenSource(tokenSource),
    )
    if err != nil {
        return nil, fmt.Errorf("gmail service init: %w", err)
    }

    return []*mcptool.Tool{
        listRecentEmails(svc),
        getEmailDetail(svc),
        sendEmail(svc),
        searchEmails(svc),
    }, nil
}

func listRecentEmails(svc *gmail.Service) *mcptool.Tool {
    return &mcptool.Tool{
        Name:        "gmail_list_recent_emails",
        Description: "Get recent emails from inbox with optional query filter",
        InputSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "max_results": map[string]interface{}{
                    "type":        "integer",
                    "description": "Maximum number of emails to return",
                    "default":     10,
                },
                "query": map[string]interface{}{
                    "type":        "string",
                    "description": "Gmail search query (e.g., 'from:boss@company.com')",
                },
                "since": map[string]interface{}{
                    "type":        "string",
                    "description": "ISO date string to filter emails after this date",
                },
            },
        },
        Handler: func(ctx context.Context, params map[string]interface{}) (string, error) {
            maxResults := int64(10)
            if v, ok := params["max_results"].(float64); ok {
                maxResults = int64(v)
            }

            // Build query
            var query string
            if q, ok := params["query"].(string); ok {
                query = q
            }
            if since, ok := params["since"].(string); ok {
                if query != "" {
                    query += " "
                }
                query += "after:" + since
            }

            call := svc.Users.Messages.List("me").MaxResults(maxResults)
            if query != "" {
                call = call.Q(query)
            }

            resp, err := call.Context(ctx).Do()
            if err != nil {
                return "", fmt.Errorf("list emails: %w", err)
            }

            type EmailSummary struct {
                ID      string `json:"id"`
                Subject string `json:"subject"`
                From    string `json:"from"`
                Date    string `json:"date"`
                Snippet string `json:"snippet"`
            }

            var emails []EmailSummary
            for _, msg := range resp.Messages {
                detail, err := svc.Users.Messages.Get("me", msg.Id).
                    Format("metadata").
                    MetadataHeaders("From", "Subject", "Date").
                    Context(ctx).Do()
                if err != nil {
                    continue
                }

                email := EmailSummary{
                    ID:      msg.Id,
                    Snippet: detail.Snippet,
                }
                for _, h := range detail.Payload.Headers {
                    switch h.Name {
                    case "Subject":
                        email.Subject = h.Value
                    case "From":
                        email.From = h.Value
                    case "Date":
                        email.Date = h.Value
                    }
                }
                emails = append(emails, email)
            }

            result, _ := json.MarshalIndent(emails, "", "  ")
            return string(result), nil
        },
    }
}

func sendEmail(svc *gmail.Service) *mcptool.Tool {
    return &mcptool.Tool{
        Name:        "gmail_send_email",
        Description: "Send an email to the specified recipient",
        InputSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "to":      map[string]interface{}{"type": "string", "description": "Recipient email"},
                "subject": map[string]interface{}{"type": "string", "description": "Email subject"},
                "body":    map[string]interface{}{"type": "string", "description": "Email body content"},
                "is_html": map[string]interface{}{"type": "boolean", "default": false},
            },
            "required": []string{"to", "subject", "body"},
        },
        Handler: func(ctx context.Context, params map[string]interface{}) (string, error) {
            to := params["to"].(string)
            subject := params["subject"].(string)
            body := params["body"].(string)
            isHTML := false
            if v, ok := params["is_html"].(bool); ok {
                isHTML = v
            }

            contentType := "text/plain"
            if isHTML {
                contentType = "text/html"
            }

            raw := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: %s; charset=utf-8\r\n\r\n%s",
                to, subject, contentType, body)

            encoded := base64.URLEncoding.EncodeToString([]byte(raw))

            _, err := svc.Users.Messages.Send("me", &gmail.Message{
                Raw: encoded,
            }).Context(ctx).Do()
            if err != nil {
                return "", fmt.Errorf("send email: %w", err)
            }

            return fmt.Sprintf("Email sent to %s", to), nil
        },
    }
}
```

### 4.3 Google Calendar MCP 도구 (Go)

```go
// internal/mcp/tools/calendar/calendar.go
package calendar

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "google.golang.org/api/calendar/v3"
    "google.golang.org/api/option"
    "golang.org/x/oauth2"

    mcptool "github.com/allen/autopilot-worker/internal/mcp"
)

func NewCalendarTools(accessToken string) ([]*mcptool.Tool, error) {
    tokenSource := oauth2.StaticTokenSource(&oauth2.Token{
        AccessToken: accessToken,
    })
    svc, err := calendar.NewService(context.Background(),
        option.WithTokenSource(tokenSource),
    )
    if err != nil {
        return nil, fmt.Errorf("calendar service init: %w", err)
    }

    return []*mcptool.Tool{
        listEventsToday(svc),
        listEventsRange(svc),
    }, nil
}

func listEventsToday(svc *calendar.Service) *mcptool.Tool {
    return &mcptool.Tool{
        Name:        "calendar_list_events_today",
        Description: "Get today's calendar events",
        InputSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "timezone": map[string]interface{}{
                    "type":    "string",
                    "default": "UTC",
                },
            },
        },
        Handler: func(ctx context.Context, params map[string]interface{}) (string, error) {
            tz := "UTC"
            if v, ok := params["timezone"].(string); ok {
                tz = v
            }

            loc, err := time.LoadLocation(tz)
            if err != nil {
                loc = time.UTC
            }

            now := time.Now().In(loc)
            startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
            endOfDay := startOfDay.Add(24 * time.Hour)

            events, err := svc.Events.List("primary").
                TimeMin(startOfDay.Format(time.RFC3339)).
                TimeMax(endOfDay.Format(time.RFC3339)).
                SingleEvents(true).
                OrderBy("startTime").
                Context(ctx).Do()
            if err != nil {
                return "", fmt.Errorf("list events: %w", err)
            }

            type EventSummary struct {
                Title     string `json:"title"`
                StartTime string `json:"start_time"`
                EndTime   string `json:"end_time"`
                Location  string `json:"location,omitempty"`
                MeetLink  string `json:"meet_link,omitempty"`
            }

            var result []EventSummary
            for _, e := range events.Items {
                ev := EventSummary{
                    Title:    e.Summary,
                    Location: e.Location,
                }
                if e.Start.DateTime != "" {
                    ev.StartTime = e.Start.DateTime
                } else {
                    ev.StartTime = e.Start.Date + " (all day)"
                }
                if e.End.DateTime != "" {
                    ev.EndTime = e.End.DateTime
                }
                if e.HangoutLink != "" {
                    ev.MeetLink = e.HangoutLink
                }
                result = append(result, ev)
            }

            out, _ := json.MarshalIndent(result, "", "  ")
            return string(out), nil
        },
    }
}
```

### 4.4 전체 MCP 도구 목록

| MCP 패키지 | Tools | 설명 |
|------------|-------|------|
| `tools/gmail` | `gmail_list_recent_emails`, `gmail_get_detail`, `gmail_send_email`, `gmail_search` | 이메일 |
| `tools/calendar` | `calendar_list_events_today`, `calendar_list_events_range` | 일정 |
| `tools/notion` | `notion_create_page`, `notion_update_page`, `notion_query_db`, `notion_search` | 노트 |
| `tools/news` | `news_get_headlines`, `news_search`, `news_trending` | 뉴스 |
| `tools/weather` | `weather_get_current`, `weather_get_forecast` | 날씨 |

---

## 5. AI Agent Executor (Go)

### 5.1 Anthropic API 호출 (Tool Use 루프)

```go
// internal/agent/executor.go
package agent

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/anthropics/anthropic-sdk-go"
    "github.com/rs/zerolog/log"

    "github.com/allen/autopilot-worker/internal/db"
    "github.com/allen/autopilot-worker/internal/mcp"
    "github.com/allen/autopilot-worker/internal/crypto"
)

const maxIterations = 10

type ExecutionContext struct {
    UserID       string
    AutomationID string
    Automation   db.Automation
    Preferences  []db.UserPreference
    Services     []db.ConnectedService
}

type StepLog struct {
    Tool          string `json:"tool"`
    DurationMs    int64  `json:"duration_ms"`
    OutputSummary string `json:"output_summary,omitempty"`
    Error         string `json:"error,omitempty"`
}

func ExecuteAutomation(ctx context.Context, jobData JobData) error {
    startTime := time.Now()

    // 1. 실행 컨텍스트 로드
    execCtx, err := loadExecutionContext(ctx, jobData)
    if err != nil {
        return fmt.Errorf("load context: %w", err)
    }

    // 2. LLM 클라이언트 생성 (Managed vs BYOK)
    client, err := createLLMClient(ctx, execCtx.UserID)
    if err != nil {
        return fmt.Errorf("create llm client: %w", err)
    }

    // 3. MCP 도구 초기화 (사용자 토큰 주입)
    registry, err := initializeTools(ctx, execCtx)
    if err != nil {
        return fmt.Errorf("init tools: %w", err)
    }

    // 4. 시스템 프롬프트 구성
    systemPrompt := buildSystemPrompt(execCtx)

    // 5. Tool Use 루프
    messages := []anthropic.MessageParam{
        anthropic.NewUserMessage(
            anthropic.NewTextBlock(execCtx.Automation.AgentPrompt),
        ),
    }

    var steps []StepLog
    var totalTokens int

    for i := 0; i < maxIterations; i++ {
        // LLM 호출
        resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
            Model:     anthropic.F(execCtx.Automation.LLMModel),
            MaxTokens: anthropic.Int(4096),
            System:    anthropic.F([]anthropic.TextBlockParam{
                anthropic.NewTextBlock(systemPrompt),
            }),
            Tools:    anthropic.F(registry.GetAnthropicToolDefs()),
            Messages: anthropic.F(messages),
        })
        if err != nil {
            return fmt.Errorf("llm call: %w", err)
        }

        totalTokens += int(resp.Usage.InputTokens + resp.Usage.OutputTokens)

        // 완료 체크
        if resp.StopReason == anthropic.MessageStopReasonEndTurn {
            resultText := extractTextContent(resp)
            return saveExecutionLog(ctx, execCtx, ExecutionResult{
                Status:        "success",
                Steps:         steps,
                ResultSummary: resultText,
                TokensUsed:    totalTokens,
                DurationMs:    time.Since(startTime).Milliseconds(),
            })
        }

        // Tool Use 처리
        var toolResults []anthropic.MessageParam
        assistantContent := resp.Content

        for _, block := range resp.Content {
            if block.Type != anthropic.ContentBlockTypeToolUse {
                continue
            }

            toolName := block.Name
            stepStart := time.Now()

            // 파라미터 파싱
            var params map[string]interface{}
            json.Unmarshal(block.Input, &params)

            // 도구 실행
            result, err := registry.Execute(ctx, toolName, params)

            step := StepLog{
                Tool:       toolName,
                DurationMs: time.Since(stepStart).Milliseconds(),
            }

            if err != nil {
                step.Error = err.Error()
                toolResults = append(toolResults, anthropic.ToolResultBlockParam{
                    ToolUseID: block.ID,
                    Content:   fmt.Sprintf("Error: %s", err.Error()),
                    IsError:   anthropic.Bool(true),
                })
            } else {
                step.OutputSummary = truncate(result, 200)
                toolResults = append(toolResults, anthropic.ToolResultBlockParam{
                    ToolUseID: block.ID,
                    Content:   result,
                })
            }

            steps = append(steps, step)
        }

        // 대화 이력 추가
        messages = append(messages,
            anthropic.NewAssistantMessage(assistantContent...),
            anthropic.NewUserMessage(toolResults...),
        )
    }

    return fmt.Errorf("max iterations reached")
}

// createLLMClient: Managed vs BYOK 분기
func createLLMClient(ctx context.Context, userID string) (*anthropic.Client, error) {
    profile, err := db.GetProfile(ctx, userID)
    if err != nil {
        return nil, err
    }

    if profile.LLMProvider == "byok" && profile.LLMAPIKeyEncrypted != "" {
        apiKey, err := crypto.Decrypt(profile.LLMAPIKeyEncrypted)
        if err != nil {
            return nil, fmt.Errorf("decrypt byok key: %w", err)
        }
        return anthropic.NewClient(
            anthropic.WithAPIKey(apiKey),
        ), nil
    }

    // Managed: 서비스 API 키 사용
    return anthropic.NewClient(), nil  // ANTHROPIC_API_KEY 환경변수 자동 사용
}

// initializeTools: 사용자의 연결된 서비스에 따라 MCP 도구 초기화
func initializeTools(ctx context.Context, execCtx *ExecutionContext) (*mcp.ToolRegistry, error) {
    registry := mcp.NewToolRegistry()

    for _, svc := range execCtx.Services {
        if !svc.IsActive {
            continue
        }

        // 토큰 복호화 + 자동 갱신
        accessToken, err := getValidAccessToken(ctx, &svc)
        if err != nil {
            log.Warn().Err(err).Str("provider", svc.Provider).Msg("skip service")
            continue
        }

        switch svc.Provider {
        case "google":
            gmailTools, _ := gmail.NewGmailTools(accessToken)
            for _, t := range gmailTools {
                registry.Register(t)
            }
            calTools, _ := calendar.NewCalendarTools(accessToken)
            for _, t := range calTools {
                registry.Register(t)
            }

        case "notion":
            notionTools, _ := notion.NewNotionTools(accessToken)
            for _, t := range notionTools {
                registry.Register(t)
            }
        }
    }

    // 토큰 불필요한 도구 (News, Weather)
    newsTools := news.NewNewsTools(config.NewsAPIKey)
    for _, t := range newsTools {
        registry.Register(t)
    }

    weatherTools := weather.NewWeatherTools(config.WeatherAPIKey)
    for _, t := range weatherTools {
        registry.Register(t)
    }

    return registry, nil
}
```

### 5.2 시스템 프롬프트 빌더

```go
// internal/agent/prompt.go
package agent

import (
    "fmt"
    "strings"
    "time"
)

func buildSystemPrompt(ctx *ExecutionContext) string {
    var sb strings.Builder

    sb.WriteString("You are a personal automation assistant executing a scheduled task.\n\n")
    sb.WriteString(fmt.Sprintf("Current time: %s\n", time.Now().UTC().Format(time.RFC3339)))

    tz := ctx.Automation.TriggerConfig.Timezone
    if tz == "" {
        tz = "UTC"
    }
    sb.WriteString(fmt.Sprintf("User timezone: %s\n\n", tz))

    // 개인화 선호도
    sb.WriteString("## User Preferences\n")
    if len(ctx.Preferences) == 0 {
        sb.WriteString("No specific preferences set.\n")
    } else {
        for _, p := range ctx.Preferences {
            sb.WriteString(fmt.Sprintf("- %s/%s: %s\n", p.Category, p.Key, p.Value))
        }
    }

    sb.WriteString(`
## Task
Execute the following automation and produce the output as specified.
Use the available tools to gather information, then compose the final result.
Be concise and actionable. Write in the user's preferred language.

## Output Rules
- Follow the output format specified in the automation config
- If sending an email, use clean HTML formatting
- If creating a Notion page, use proper markdown
`)

    return sb.String()
}
```

---

## 6. 스케줄러 / Job Queue (Go)

### 6.1 Asynq — Go 네이티브 Redis 기반 태스크 큐

BullMQ(Node.js) 대신 [Asynq](https://github.com/hibiken/asynq)를 사용합니다.
Go 네이티브이고, 재시도, 스케줄링, 큐 우선순위, 웹 UI를 모두 지원합니다.

```go
// internal/scheduler/queue.go
package scheduler

import (
    "encoding/json"
    "fmt"

    "github.com/hibiken/asynq"
)

const (
    TypeAutomationExec = "automation:execute"
)

// 잡 페이로드
type AutomationPayload struct {
    UserID       string                 `json:"user_id"`
    AutomationID string                 `json:"automation_id"`
    TriggerData  map[string]interface{} `json:"trigger_data"`
}

// 잡 생성
func NewAutomationTask(payload AutomationPayload) (*asynq.Task, error) {
    data, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }
    return asynq.NewTask(
        TypeAutomationExec,
        data,
        asynq.MaxRetry(3),
        asynq.Timeout(5*time.Minute),        // 자동화 실행 최대 5분
        asynq.Queue("automations"),
    ), nil
}
```

### 6.2 Cron 디스패처

```go
// internal/scheduler/cron.go
package scheduler

import (
    "context"
    "time"

    "github.com/hibiken/asynq"
    "github.com/rs/zerolog/log"

    "github.com/allen/autopilot-worker/internal/db"
)

type CronDispatcher struct {
    db     *db.Queries
    client *asynq.Client
}

func NewCronDispatcher(db *db.Queries, redisAddr string) *CronDispatcher {
    client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
    return &CronDispatcher{db: db, client: client}
}

// Tick은 매분 호출되어 실행 예정인 자동화를 디스패치
func (d *CronDispatcher) Tick(ctx context.Context) {
    now := time.Now()

    automations, err := d.db.GetDueAutomations(ctx, now)
    if err != nil {
        log.Error().Err(err).Msg("failed to get due automations")
        return
    }

    for _, auto := range automations {
        task, err := NewAutomationTask(AutomationPayload{
            UserID:       auto.UserID,
            AutomationID: auto.ID,
            TriggerData: map[string]interface{}{
                "triggered_by": "cron",
                "triggered_at": now,
            },
        })
        if err != nil {
            log.Error().Err(err).Str("automation_id", auto.ID).Msg("create task failed")
            continue
        }

        // 중복 방지: TaskID로 동일 잡 방지
        taskID := fmt.Sprintf("%s-%d", auto.ID, now.Unix())
        _, err = d.client.Enqueue(task, asynq.TaskID(taskID))
        if err != nil {
            log.Error().Err(err).Str("automation_id", auto.ID).Msg("enqueue failed")
            continue
        }

        // next_run_at 업데이트
        nextRun := calculateNextRun(auto.TriggerConfig)
        d.db.UpdateAutomationNextRun(ctx, auto.ID, now, nextRun)

        log.Info().
            Str("automation_id", auto.ID).
            Str("user_id", auto.UserID).
            Time("next_run", nextRun).
            Msg("dispatched automation")
    }
}
```

### 6.3 Worker (Asynq Consumer)

```go
// internal/scheduler/worker.go
package scheduler

import (
    "context"
    "encoding/json"

    "github.com/hibiken/asynq"
    "github.com/rs/zerolog/log"

    "github.com/allen/autopilot-worker/internal/agent"
    "github.com/allen/autopilot-worker/internal/db"
)

func NewWorker(redisAddr string, database *db.Queries) *asynq.Server {
    srv := asynq.NewServer(
        asynq.RedisClientOpt{Addr: redisAddr},
        asynq.Config{
            Concurrency: 20,                    // 동시 실행 goroutine 수
            Queues: map[string]int{
                "automations": 10,              // 우선순위 가중치
                "default":     5,
            },
            RetryDelayFunc: asynq.DefaultRetryDelayFunc,
        },
    )
    return srv
}

// HandleAutomationExec는 자동화 실행 핸들러
func HandleAutomationExec(ctx context.Context, task *asynq.Task) error {
    var payload AutomationPayload
    if err := json.Unmarshal(task.Payload(), &payload); err != nil {
        return fmt.Errorf("unmarshal payload: %w", err)
    }

    log.Info().
        Str("user_id", payload.UserID).
        Str("automation_id", payload.AutomationID).
        Msg("executing automation")

    // 사용량 체크
    if err := checkUsageLimit(ctx, payload.UserID); err != nil {
        return err
    }

    // 에이전트 실행
    return agent.ExecuteAutomation(ctx, agent.JobData{
        UserID:       payload.UserID,
        AutomationID: payload.AutomationID,
        TriggerData:  payload.TriggerData,
    })
}
```

### 6.4 main.go — 모든 것을 연결

```go
// cmd/worker/main.go
package main

import (
    "context"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/hibiken/asynq"
    "github.com/robfig/cron/v3"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"

    "github.com/allen/autopilot-worker/internal/config"
    "github.com/allen/autopilot-worker/internal/db"
    "github.com/allen/autopilot-worker/internal/scheduler"
)

func main() {
    // 로깅 설정
    zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
    log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

    // 설정 로드
    cfg := config.Load()

    // DB 연결
    database, err := db.Connect(cfg.DatabaseURL)
    if err != nil {
        log.Fatal().Err(err).Msg("failed to connect to database")
    }
    defer database.Close()

    // ========================================
    // 1. Asynq Worker 시작
    // ========================================
    worker := scheduler.NewWorker(cfg.RedisAddr, database)
    mux := asynq.NewServeMux()
    mux.HandleFunc(scheduler.TypeAutomationExec, scheduler.HandleAutomationExec)

    go func() {
        if err := worker.Run(mux); err != nil {
            log.Fatal().Err(err).Msg("asynq worker failed")
        }
    }()
    log.Info().Msg("asynq worker started")

    // ========================================
    // 2. Cron Scheduler 시작 (매분 실행)
    // ========================================
    dispatcher := scheduler.NewCronDispatcher(database, cfg.RedisAddr)
    cronScheduler := cron.New()
    cronScheduler.AddFunc("* * * * *", func() {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        dispatcher.Tick(ctx)
    })
    cronScheduler.Start()
    log.Info().Msg("cron scheduler started")

    // ========================================
    // 3. Graceful Shutdown
    // ========================================
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Info().Msg("shutting down...")
    cronScheduler.Stop()
    worker.Shutdown()
    log.Info().Msg("shutdown complete")
}
```

---

## 7. 토큰 암호화 (Go)

```go
// internal/crypto/crypto.go
package crypto

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "io"
    "os"
    "strings"
)

var encryptionKey []byte

func init() {
    keyHex := os.Getenv("TOKEN_ENCRYPTION_KEY")
    if keyHex == "" {
        panic("TOKEN_ENCRYPTION_KEY not set")
    }
    var err error
    encryptionKey, err = hex.DecodeString(keyHex)
    if err != nil || len(encryptionKey) != 32 {
        panic("TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
    }
}

// Encrypt encrypts plaintext using AES-256-GCM
// Returns "iv_hex:ciphertext_hex" format
func Encrypt(plaintext string) (string, error) {
    block, err := aes.NewCipher(encryptionKey)
    if err != nil {
        return "", err
    }

    aesGCM, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    nonce := make([]byte, aesGCM.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }

    ciphertext := aesGCM.Seal(nil, nonce, []byte(plaintext), nil)

    return fmt.Sprintf("%s:%s",
        hex.EncodeToString(nonce),
        hex.EncodeToString(ciphertext),
    ), nil
}

// Decrypt decrypts "iv_hex:ciphertext_hex" format
func Decrypt(encrypted string) (string, error) {
    parts := strings.SplitN(encrypted, ":", 2)
    if len(parts) != 2 {
        return "", fmt.Errorf("invalid encrypted format")
    }

    nonce, err := hex.DecodeString(parts[0])
    if err != nil {
        return "", err
    }

    ciphertext, err := hex.DecodeString(parts[1])
    if err != nil {
        return "", err
    }

    block, err := aes.NewCipher(encryptionKey)
    if err != nil {
        return "", err
    }

    aesGCM, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }

    plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }

    return string(plaintext), nil
}
```

---

## 8. 프로젝트 디렉토리 구조

```
autopilot/
│
├── web/                                # Next.js 프론트엔드 + API
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── signup/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── automations/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── logs/page.tsx
│   │   │   │   ├── connections/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── connect/[provider]/route.ts
│   │   │   │   │   └── callback/[provider]/route.ts
│   │   │   │   ├── automations/route.ts
│   │   │   │   ├── templates/route.ts
│   │   │   │   ├── webhooks/[provider]/route.ts   # → Redis에 잡 추가
│   │   │   │   └── billing/
│   │   │   │       ├── checkout/route.ts
│   │   │   │       └── webhook/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── automation-card.tsx
│   │   │   ├── connection-card.tsx
│   │   │   ├── execution-log-viewer.tsx
│   │   │   ├── template-picker.tsx
│   │   │   └── natural-language-input.tsx
│   │   └── lib/
│   │       ├── supabase/
│   │       ├── stripe.ts
│   │       └── redis.ts                # Asynq 잡 enqueue용
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── worker/                             # Go 워커 서비스
│   ├── cmd/
│   │   └── worker/
│   │       └── main.go                 # 엔트리포인트
│   ├── internal/
│   │   ├── agent/
│   │   │   ├── executor.go             # AI 에이전트 실행 엔진
│   │   │   ├── prompt.go               # 시스템 프롬프트 빌더
│   │   │   ├── feedback.go             # 피드백 파서
│   │   │   └── output.go               # HTML 이메일 등 출력 포맷터
│   │   ├── mcp/
│   │   │   ├── tool.go                 # Tool 인터페이스 & Registry
│   │   │   └── tools/
│   │   │       ├── gmail/gmail.go
│   │   │       ├── calendar/calendar.go
│   │   │       ├── notion/notion.go
│   │   │       ├── news/news.go
│   │   │       └── weather/weather.go
│   │   ├── scheduler/
│   │   │   ├── queue.go                # Asynq 잡 정의
│   │   │   ├── cron.go                 # Cron 디스패처
│   │   │   └── worker.go              # Asynq 워커
│   │   ├── db/
│   │   │   ├── connection.go           # pgx 커넥션 풀
│   │   │   ├── queries.go              # SQL 쿼리
│   │   │   └── models.go              # DB 모델 구조체
│   │   ├── crypto/
│   │   │   └── crypto.go              # AES-256-GCM 암복호화
│   │   ├── oauth/
│   │   │   ├── token.go               # 토큰 갱신
│   │   │   └── google.go
│   │   └── config/
│   │       └── config.go              # 환경변수 로드
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── Makefile
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_connected_services.sql
│   │   ├── 003_create_automations.sql
│   │   ├── 004_create_execution_logs.sql
│   │   ├── 005_create_user_preferences.sql
│   │   ├── 006_create_usage_tracking.sql
│   │   └── 007_create_rls_policies.sql
│   └── seed.sql
│
├── docker-compose.yml                  # 로컬 개발용
└── README.md
```

---

## 9. 배포 전략

### 이중 배포

| 서비스 | 플랫폼 | 설명 |
|--------|--------|------|
| **Next.js (web/)** | Vercel | UI + REST API + OAuth 콜백 + Webhook 수신 |
| **Go Worker (worker/)** | Fly.io | 에이전트 실행 + 스케줄러 + MCP 서버 |
| **PostgreSQL** | Supabase | 데이터 저장 |
| **Redis** | Upstash | 잡 큐 (Next.js ↔ Go 워커 통신) |

### Go Worker Dockerfile

```dockerfile
# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY worker/go.mod worker/go.sum ./
RUN go mod download
COPY worker/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /autopilot-worker ./cmd/worker

# Run stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /autopilot-worker /autopilot-worker
CMD ["/autopilot-worker"]
```

### Fly.io 배포

```toml
# worker/fly.toml
app = "autopilot-worker"
primary_region = "iad"    # US East (Supabase/Upstash와 같은 리전)

[build]
  dockerfile = "Dockerfile"

[env]
  TZ = "UTC"

[processes]
  worker = "/autopilot-worker"

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"           # Go는 메모리 효율적
```

### Next.js → Go 워커 통신 (Redis를 통한 비동기)

```typescript
// web/src/lib/redis.ts
// Next.js API 라우트에서 Go 워커에 잡을 전달

import { createClient } from "redis";

// Asynq 호환 형식으로 Redis에 잡 enqueue
export async function enqueueAutomationJob(payload: {
  userId: string;
  automationId: string;
  triggerData: Record<string, unknown>;
}) {
  const redis = createClient({ url: process.env.UPSTASH_REDIS_URL });
  await redis.connect();

  // Asynq 프로토콜: asynq:{queue}:pending 리스트에 추가
  const taskData = JSON.stringify({
    type: "automation:execute",
    payload: JSON.stringify(payload),
  });

  await redis.lPush("asynq:{automations}:pending", taskData);
  await redis.disconnect();
}
```

---

## 10. 환경변수

### Go Worker (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=xxx

# Redis
REDIS_ADDR=xxx.upstash.io:6379
REDIS_PASSWORD=xxx

# LLM (Managed)
ANTHROPIC_API_KEY=sk-ant-xxx

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Encryption
TOKEN_ENCRYPTION_KEY=64자_hex_문자열

# External APIs
NEWS_API_KEY=xxx
OPENWEATHERMAP_API_KEY=xxx
```

### Next.js (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Redis (잡 enqueue용)
UPSTASH_REDIS_URL=rediss://xxx@xxx.upstash.io:6379

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://app.autopilot.ai/api/auth/callback/google

NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Encryption (Go 워커와 동일한 키 공유)
TOKEN_ENCRYPTION_KEY=64자_hex_문자열
```

---

## 11. 비용 시뮬레이션

### 1,000 유저 기준 월간 비용

| 항목 | 계산 | 월 비용 |
|------|------|---------|
| Supabase (Pro) | DB + Auth | $25 |
| Vercel (Pro) | Next.js 호스팅 | $20 |
| **Fly.io (Go Worker)** | shared-cpu-1x, 256MB | **$3~5** |
| Upstash Redis | 10K commands/day | $0 (무료) |
| Claude API (Managed) | 700유저 × 30회 × ~2K tokens | ~$126 |
| Resend | 1,000 × 30 이메일 | $20 |
| **합계** | | **~$196/월** |

> Go 워커는 Fly.io shared VM에서 월 $3~5로 운영 가능.
> Node.js 워커 대비 메모리 사용량이 1/3~1/5 수준이라 비용 효율적.

---

## 12. 보안 체크리스트

- [ ] OAuth 토큰 AES-256-GCM 암호화 (Go crypto/aes)
- [ ] 암호화 키 환경변수 관리 (Next.js ↔ Go 동일 키)
- [ ] Supabase RLS 전체 테이블 적용
- [ ] Go 워커는 service_role 키로 DB 접근 (RLS 바이패스)
- [ ] Webhook HMAC 서명 검증
- [ ] Asynq 대시보드 인증 (asynqmon)
- [ ] Go 바이너리: CGO_ENABLED=0 (정적 빌드)
- [ ] Rate limiting: per-user + per-IP
- [ ] 실행 로그 민감정보 마스킹
- [ ] 토큰 자동 갱신 + 만료 처리

---

## 13. 개발 순서 (Go Edition)

| 주차 | Next.js (web/) | Go Worker (worker/) |
|------|---------------|---------------------|
| **Week 1** | Supabase 셋업, Auth, 기본 UI | Go 프로젝트 초기화, DB 연결, Asynq 셋업 |
| **Week 2** | OAuth 플로우 (Google), 대시보드 | Gmail + Calendar MCP 도구 구현 |
| **Week 3** | 자동화 CRUD UI, 템플릿 선택 | Agent Executor (LLM Tool Use 루프) |
| **Week 4** | 실행 로그 뷰어, 설정 페이지 | Cron 스케줄러, Morning Briefing 템플릿 |
| **Week 5** | Stripe 결제, 랜딩 페이지 | 나머지 템플릿, Notion/News/Weather MCP |
| **Week 6** | Product Hunt 준비, 버그 수정 | 부하 테스트, 에러 핸들링, 모니터링 |