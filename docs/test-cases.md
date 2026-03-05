# Floqi — Test Cases

> `user-stories.md` 기반으로 도출한 테스트 케이스
> 형식: TC-[Epic][번호] / 유형: Unit | Integration | E2E | Security
> 상태: 🔲 미작성 | 🔳 작성완료 | ✅ 통과 | ❌ 실패

---

## Epic 1: 인증 & 온보딩

### US-101: 이메일/비밀번호 회원가입

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-1001 | E2E | 유효한 이메일과 비밀번호(8자 이상)로 가입 | 가입 성공, 인증 이메일 발송, profiles 레코드 생성 |
| TC-1002 | E2E | 이미 등록된 이메일로 가입 시도 | "이미 사용 중인 이메일" 에러 메시지 표시 |
| TC-1003 | E2E | 비밀번호 8자 미만으로 가입 시도 | 유효성 검증 실패 메시지 표시 |
| TC-1004 | E2E | 이메일 형식이 아닌 값으로 가입 시도 | 유효성 검증 실패 메시지 표시 |
| TC-1005 | Integration | 가입 완료 시 profiles 테이블에 레코드 자동 생성 | id = auth.users.id, email 일치, plan = 'free' |
| TC-1006 | E2E | 이메일/비밀번호 필드를 비운 채 가입 시도 | 필수 입력 안내 표시 |

### US-102: 이메일/비밀번호 로그인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-1007 | E2E | 올바른 이메일/비밀번호로 로그인 | 대시보드(/)로 리다이렉트, 세션 쿠키 생성 |
| TC-1008 | E2E | 잘못된 비밀번호로 로그인 시도 | "이메일 또는 비밀번호가 올바르지 않습니다" 에러 |
| TC-1009 | E2E | 존재하지 않는 이메일로 로그인 시도 | 동일한 에러 메시지 (이메일 존재 여부 노출 방지) |
| TC-1010 | E2E | 이메일 인증 미완료 계정으로 로그인 시도 | 이메일 인증 필요 안내 |

### US-103: Google OAuth 가입/로그인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-1011 | E2E | 신규 사용자가 Google OAuth로 가입 | Google consent → 콜백 → profiles 생성 → 대시보드 리다이렉트 |
| TC-1012 | E2E | 기존 사용자가 Google OAuth로 로그인 | 기존 계정으로 로그인, 대시보드 리다이렉트 |
| TC-1013 | E2E | Google OAuth consent 화면에서 취소 | 로그인 페이지로 돌아옴, 에러 없음 |
| TC-1014 | Integration | OAuth 콜백에 잘못된 코드 전달 | 401 에러, 로그인 페이지로 리다이렉트 |

### US-104: 온보딩

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-1015 | E2E | 첫 로그인 시 온보딩 화면 표시 | onboarding_completed = false인 경우 온보딩 플로우로 이동 |
| TC-1016 | E2E | 타임존과 언어 선택 후 완료 | profiles.timezone, preferred_language 업데이트, onboarding_completed = true |
| TC-1017 | E2E | 온보딩 완료 후 재로그인 | 온보딩 건너뛰고 바로 대시보드 |

### US-105: 로그아웃

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-1018 | E2E | 로그아웃 버튼 클릭 | 세션 종료, 랜딩 페이지로 리다이렉트 |
| TC-1019 | E2E | 로그아웃 후 대시보드 URL 직접 접근 | 로그인 페이지로 리다이렉트 |

---

## Epic 2: 서비스 연결

### US-201: Google OAuth 서비스 연결

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-2001 | E2E | Connections 페이지에서 Google 연결 클릭 | Google consent 화면으로 이동, 올바른 scopes 요청 |
| TC-2002 | Integration | Google OAuth 콜백 성공 | connected_services에 레코드 생성, access_token/refresh_token AES-256-GCM 암호화 저장 |
| TC-2003 | Unit | 토큰 암호화 후 복호화 | 원본 토큰과 일치 |
| TC-2004 | Integration | 이미 연결된 Google 계정 재연결 | 기존 레코드 업데이트 (UPSERT) |
| TC-2005 | E2E | Google OAuth consent에서 권한 거부 | 연결 실패 메시지, connected_services 레코드 미생성 |

### US-202: Notion OAuth 서비스 연결

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-2006 | E2E | Notion 연결 클릭 → 인증 완료 | connected_services에 notion 레코드 생성, 토큰 암호화 |
| TC-2007 | E2E | Notion 연결 시 workspace 선택 | 선택한 workspace의 접근 토큰 저장 |

### US-203: 연결 서비스 목록 확인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-2008 | E2E | 서비스 미연결 상태에서 Connections 페이지 접속 | Google, Notion 카드가 "미연결" 상태로 표시 |
| TC-2009 | E2E | Google 연결 후 Connections 페이지 확인 | Google 카드가 "연결됨" + 연결 날짜 표시 |
| TC-2010 | Integration | 다른 사용자의 연결 서비스가 노출되지 않는지 확인 (RLS) | 본인 레코드만 반환 |

### US-204: 서비스 연결 해제

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-2011 | E2E | Google 연결 해제 클릭 | 확인 모달 표시, 관련 자동화 비활성화 경고 포함 |
| TC-2012 | Integration | 연결 해제 확인 | connected_services 레코드 삭제, 암호화된 토큰 제거 |
| TC-2013 | Integration | 연결 해제 시 관련 자동화 상태 | 해당 서비스 의존 자동화 status → 'paused' 전환 |

### US-205: 토큰 자동 갱신

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-2014 | Unit | 만료 5분 전 토큰으로 자동화 실행 | refresh_token으로 새 access_token 발급, 새 토큰 암호화 저장 |
| TC-2015 | Unit | 유효한 토큰으로 자동화 실행 | 갱신 없이 기존 토큰 사용 |
| TC-2016 | Unit | refresh_token 만료 (Google revoke) | 갱신 실패, 사용자에게 재연결 알림, 자동화 일시정지 |

---

## Epic 3: 자동화 관리

### US-301: 템플릿 기반 자동화 생성

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3001 | E2E | 템플릿 목록에서 Morning Briefing 선택 | 5개 템플릿 카드 표시, 선택 시 상세 설정 화면 이동 |
| TC-3002 | E2E | Morning Briefing 템플릿으로 자동화 생성 | automations 레코드 생성: template_id, agent_prompt, trigger_config 기본값 설정 |
| TC-3003 | E2E | 필수 서비스(Google) 미연결 상태에서 템플릿 선택 | "Google 연결이 필요합니다" 안내 + 연결 버튼 |

### US-302: 자연어 커스텀 자동화 생성

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3004 | E2E | 자연어 입력 "매일 오전 8시에 뉴스 요약해줘" 입력 | automations 레코드 생성, agent_prompt에 입력값 저장 |
| TC-3005 | E2E | 빈 프롬프트로 생성 시도 | 유효성 검증 실패, "자동화 설명을 입력해주세요" |

### US-303: 자동화 목록 확인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3006 | E2E | 자동화 0개인 상태에서 목록 페이지 | 빈 상태 UI 표시 + "Create Automation" CTA |
| TC-3007 | E2E | 자동화 3개 생성 후 목록 페이지 | 3개 카드 표시: 이름, 아이콘, 상태, last_run_at, next_run_at |
| TC-3008 | Integration | 다른 사용자의 자동화가 노출되지 않는지 확인 (RLS) | 본인 자동화만 반환 |

### US-304: 스케줄 설정

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3009 | E2E | "매일 오전 7시" 선택 | trigger_config.cron = "0 7 * * *" 저장 |
| TC-3010 | E2E | "매주 월요일 오전 9시" 선택 | trigger_config.cron = "0 9 * * 1" 저장 |
| TC-3011 | Unit | 사용자 타임존(Asia/Seoul) 반영 | 크론 표현식이 사용자 타임존 기준으로 변환 |

### US-305: 자동화 활성화/일시정지

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3012 | E2E | active 상태의 자동화를 paused로 전환 | status = 'paused' 업데이트, UI에 일시정지 뱃지 |
| TC-3013 | E2E | paused 상태의 자동화를 active로 전환 | status = 'active' 업데이트, next_run_at 재계산 |
| TC-3014 | Integration | paused 자동화가 CronDispatcher에서 제외되는지 확인 | GetActiveAutomations 쿼리 결과에 미포함 |

### US-306: 자동화 삭제

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3015 | E2E | 삭제 버튼 클릭 | 확인 모달 표시 |
| TC-3016 | E2E | 삭제 확인 | automations 레코드 삭제, 목록에서 제거 |
| TC-3017 | Integration | 삭제된 자동화의 실행 로그 | execution_logs는 CASCADE 삭제 |

### US-307: 자동화 수정

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3018 | E2E | agent_prompt 텍스트 수정 후 저장 | 업데이트된 프롬프트가 DB에 반영 |
| TC-3019 | E2E | 스케줄 변경 (매일 → 매주) | trigger_config 업데이트, next_run_at 재계산 |

### US-308: 수동 실행

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-3020 | E2E | "Run Now" 버튼 클릭 | on_demand 태스크 생성 → Asynq 큐 전달 → 실행 로그 생성 |
| TC-3021 | E2E | 실행 완료 후 결과 확인 | 실행 로그 상세 페이지에서 결과 확인 가능 |

---

## Epic 4: 자동화 템플릿

### US-401: Morning Briefing

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-4001 | Integration | Morning Briefing 실행 시 calendar_list_events_today 호출 | 오늘 일정 목록 반환 |
| TC-4002 | Integration | Morning Briefing 실행 시 gmail_list_recent_emails 호출 | 최근 중요 이메일 요약 반환 |
| TC-4003 | Integration | Morning Briefing 실행 시 weather_current 호출 | 현재 날씨 정보 반환 |
| TC-4004 | Integration | 모든 도구 결과 종합 → 이메일 발송 | gmail_send_email로 요약 이메일 전송 |
| TC-4005 | E2E | Google 미연결 상태에서 Morning Briefing 실행 | tool_use 실패 → 에러 로그 기록 → "Google 재연결 필요" 메시지 |

### US-402: Email Triage

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-4006 | Integration | Email Triage 실행 → 미읽은 이메일 조회 | gmail_list_recent_emails(query: "is:unread") 호출 |
| TC-4007 | Integration | AI가 이메일을 긴급/중요/참고로 분류 | result_summary에 분류 결과 포함 |
| TC-4008 | Integration | 미읽은 이메일이 0개인 경우 | "새로운 이메일이 없습니다" 결과 반환 |

### US-403: Reading Digest

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-4009 | Integration | Reading Digest 실행 → 뉴스 수집 | news_headlines 호출, 사용자 관심 카테고리 기반 |
| TC-4010 | Integration | 수집된 뉴스 → AI 요약 생성 | 주요 기사 3~5개 요약 텍스트 |
| TC-4011 | Integration | 결과를 Notion에 저장 (Notion 연결 시) | notion_create_page 호출, 페이지 생성 확인 |

### US-404: Weekly Review

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-4012 | Integration | Weekly Review 실행 → 주간 일정 조회 | calendar_list_events (7일 범위) 호출 |
| TC-4013 | Integration | 주간 실행 로그 집계 | execution_logs에서 7일간 통계 추출 |

### US-405: Smart Save

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-4014 | Integration | Webhook 트리거로 Smart Save 실행 | 수신 데이터 → Notion 페이지 생성 |
| TC-4015 | Integration | Notion 미연결 상태에서 Smart Save 실행 | 실패 로그 + "Notion 연결 필요" 안내 |

---

## Epic 5: 자동화 실행 엔진

### US-501: Cron 스케줄 자동 실행

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5001 | Integration | CronDispatcher가 due automation을 감지 | next_run_at ≤ now인 자동화를 Asynq 큐에 enqueue |
| TC-5002 | Integration | 태스크 enqueue 후 next_run_at 업데이트 | 다음 실행 시간 올바르게 계산 |
| TC-5003 | Integration | paused 자동화가 스케줄 대상에서 제외 | GetActiveAutomations 쿼리가 paused를 필터링 |
| TC-5004 | Unit | 동일 자동화 중복 enqueue 방지 | 같은 자동화 ID + 타임스탬프로 TaskID 생성, 중복 시 무시 |

### US-502: AI Agent Tool Use 루프

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5005 | Unit | Anthropic API 호출 성공 (tool_use 없음) | StopReason = end_turn, 텍스트 결과 반환 |
| TC-5006 | Unit | tool_use 1회 → tool_result → end_turn | 도구 호출 1회, 최종 텍스트 결과 반환 |
| TC-5007 | Unit | tool_use 3회 연속 → end_turn | 3개 도구 순차 호출, 모든 결과 대화 이력에 포함 |
| TC-5008 | Unit | maxIterations(10) 도달 | "max iterations reached" 에러 반환, 실행 로그에 기록 |
| TC-5009 | Unit | 도구 실행 중 에러 발생 | tool_result에 is_error: true 전달, AI가 대체 방안 시도 |
| TC-5010 | Unit | Anthropic API 타임아웃 | 에러 반환, Asynq 재시도 트리거 |

### US-503: 실행 로그 기록

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5011 | Integration | 실행 시작 시 로그 생성 | execution_logs: status = 'running', started_at 기록 |
| TC-5012 | Integration | 실행 성공 완료 | status = 'success', completed_at, duration_ms, output, tokens_used 기록 |
| TC-5013 | Integration | 실행 실패 완료 | status = 'failed', error_message 기록 |
| TC-5014 | Integration | tool_calls JSON 정확성 | 각 도구별 이름, 입력, 출력, 소요 시간 기록 |

### US-504: 실패 시 재시도

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5015 | Integration | 1차 실행 실패 → 자동 재시도 | Asynq가 지수 백오프로 재시도 |
| TC-5016 | Integration | 3회 재시도 모두 실패 | 최종 실패 상태 기록, error_count 증가 |
| TC-5017 | Integration | 2차 재시도에서 성공 | status = 'success', run_count 증가 |

### US-505: Managed/BYOK LLM 분기

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5018 | Unit | llm_config.mode = "managed" | 서비스 ANTHROPIC_API_KEY 사용 |
| TC-5019 | Unit | llm_config.mode = "byok", 유효한 키 | 복호화된 사용자 API 키 사용 |
| TC-5020 | Unit | llm_config.mode = "byok", 복호화 실패 | managed 모드로 폴백, 에러 로깅 |
| TC-5021 | Unit | llm_config가 빈 JSON | managed 모드로 기본 동작 |

### US-506: Webhook 트리거

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-5022 | Integration | 유효한 Webhook POST 요청 수신 | Redis 큐에 태스크 enqueue, 202 응답 |
| TC-5023 | Integration | 존재하지 않는 automation_id로 Webhook 수신 | 404 응답 |
| TC-5024 | Integration | HMAC 서명 검증 실패 | 401 응답, 태스크 미생성 |

---

## Epic 6: 실행 로그 & 모니터링

### US-601: 실행 로그 목록

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-6001 | E2E | Logs 페이지 접근 | 실행 로그 리스트 최신순 표시 |
| TC-6002 | E2E | 성공/실패/실행중 로그 표시 | 각 상태별 아이콘/색상 구분 |
| TC-6003 | E2E | 실행 로그 0개 상태 | "아직 실행 이력이 없습니다" 빈 상태 UI |

### US-602: 실행 로그 상세

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-6004 | E2E | 로그 항목 클릭 → 상세 페이지 | result_summary, tool_calls 단계별 표시, tokens_used |
| TC-6005 | E2E | 실패 로그 상세 페이지 | error_message 강조 표시 |
| TC-6006 | E2E | tool_calls 단계별 펼침 | 각 도구: 이름, 입력 파라미터, 출력 결과, 소요 시간 |

### US-603: 로그 필터링

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-6007 | E2E | 특정 자동화 필터 선택 | 해당 automation_id 로그만 표시 |
| TC-6008 | E2E | "실패만" 필터 | status = 'failed' 로그만 표시 |
| TC-6009 | E2E | 날짜 범위 필터 (최근 7일) | created_at 기준 필터링 |

### US-604: 대시보드 통계

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-6010 | E2E | 대시보드 통계 카드 표시 | 활성 자동화 수, 이번 주 실행 횟수, 총 토큰, 성공률 |
| TC-6011 | Integration | 통계 데이터 정확성 | DB 집계 결과와 UI 수치 일치 |

---

## Epic 7: 설정 & 개인화

### US-701: 프로필 설정

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-7001 | E2E | Settings 페이지에서 이름 변경 | profiles.display_name 업데이트 |
| TC-7002 | E2E | 타임존 변경 (UTC → Asia/Seoul) | profiles.timezone 업데이트 |
| TC-7003 | Integration | 변경된 타임존이 AI 프롬프트에 반영 | buildSystemPrompt에서 "User timezone: Asia/Seoul" 출력 |
| TC-7004 | E2E | 선호 언어 변경 (en → ko) | profiles.preferred_language 업데이트 |

### US-702: BYOK API 키 등록

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-7005 | E2E | 유효한 Anthropic API 키 입력 | 키 유효성 검증 (테스트 호출) 통과, AES-256-GCM 암호화 저장 |
| TC-7006 | E2E | 잘못된 API 키 입력 | 유효성 검증 실패, "유효하지 않은 API 키" 에러 |
| TC-7007 | E2E | BYOK → Managed 모드 전환 | 암호화된 키 삭제, llm_config.mode = "managed" |
| TC-7008 | Unit | 암호화된 API 키가 DB에서 평문으로 노출되지 않음 | llm_api_key_encrypted 컬럼이 hex 암호문 |

### US-703: 선호도 설정

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-7009 | E2E | 관심 뉴스 카테고리 선택 (technology, science) | user_preferences에 저장 |
| TC-7010 | Integration | 선호도가 AI 시스템 프롬프트에 포함 | buildSystemPrompt 결과에 "news/category: technology, science" 포함 |

### US-704: 출력 형식 설정

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-7011 | E2E | 출력 형식 "이메일" 선택 | agent_config.output_format = "email" |
| TC-7012 | E2E | 출력 형식 "Notion" 선택 (Notion 미연결) | "Notion 연결이 필요합니다" 경고 |

### US-705: 계정 삭제

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-7013 | E2E | 계정 삭제 요청 | 비밀번호 재입력 확인, "정말 삭제하시겠습니까?" 경고 |
| TC-7014 | Integration | 삭제 확인 후 데이터 정리 | profiles, connected_services, automations, execution_logs, user_preferences 모두 CASCADE 삭제 |

---

## Epic 8: 결제 & 사용량

### US-801: 요금제 확인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-8001 | E2E | Free 사용자 Settings 페이지 | 현재 플랜: Free, 한도 표시 |
| TC-8002 | E2E | Pro 사용자 Settings 페이지 | 현재 플랜: Pro, 확장된 한도 표시 |

### US-802: Pro 업그레이드

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-8003 | E2E | "Upgrade to Pro" 클릭 | Stripe Checkout 세션으로 리다이렉트 |
| TC-8004 | Integration | Stripe Webhook: checkout.session.completed | profiles.plan = 'pro' 업데이트 |
| TC-8005 | Integration | Stripe 결제 실패 | 플랜 변경 없음, 에러 안내 |

### US-803: 사용량 확인

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-8006 | E2E | 사용량 대시보드 표시 | 이번 달 실행 횟수, 토큰 사용량, 한도 대비 % |
| TC-8007 | Integration | 사용량 데이터 정확성 | usage_tracking 테이블 집계 값과 UI 일치 |

### US-804: Free 플랜 실행 제한

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-8008 | Integration | Free 사용자 한도 내 실행 | 정상 실행 |
| TC-8009 | Integration | Free 사용자 한도 초과 실행 | 실행 거부, "업그레이드" 안내 메시지 |
| TC-8010 | Integration | Pro 사용자 한도 확인 | 확장된 한도 적용 |
| TC-8011 | Integration | BYOK 사용자 한도 확인 | 무제한 실행 허용 |

---

## Epic 9: 랜딩 페이지

### US-901: 서비스 소개

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-9001 | E2E | 랜딩 페이지 접근 (비로그인) | 히어로 섹션, 3단계 사용법, 템플릿 소개 표시 |
| TC-9002 | E2E | 모바일 반응형 확인 | 768px 이하에서 레이아웃 깨짐 없음 |

### US-902: 가입 유도

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-9003 | E2E | "Get started free" CTA 클릭 | /signup 페이지로 이동 |
| TC-9004 | E2E | "Log in" 링크 클릭 | /login 페이지로 이동 |
| TC-9005 | E2E | 로그인 상태에서 랜딩 페이지 접근 | 대시보드로 리다이렉트 |

### US-903: 요금제 비교표

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-9006 | E2E | 요금제 섹션 스크롤 | Free / Pro / BYOK 3개 플랜 비교표 표시 |

---

## Epic 10: 보안 & 인프라

### US-1001: OAuth 토큰 암호화

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10001 | Unit | Encrypt("test-token") → Decrypt() | 원본과 일치 |
| TC-10002 | Unit | 다른 키로 Decrypt 시도 | 복호화 실패 에러 |
| TC-10003 | Unit | 빈 문자열 암호화 | 정상 처리 또는 명시적 에러 |
| TC-10004 | Unit | 암호화 키가 32바이트(64 hex chars) 아닌 경우 | NewCipher 생성 시 에러 |
| TC-10005 | Unit | 동일 평문을 2회 암호화 | 서로 다른 암호문 생성 (nonce 랜덤) |

### US-1002: Supabase RLS 데이터 격리

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10006 | Security | User A로 인증 후 User B의 profiles 조회 | 빈 결과 반환 |
| TC-10007 | Security | User A로 인증 후 User B의 automations 조회 | 빈 결과 반환 |
| TC-10008 | Security | User A로 인증 후 User B의 execution_logs 조회 | 빈 결과 반환 |
| TC-10009 | Security | User A로 인증 후 User B의 connected_services 조회 | 빈 결과 반환 |
| TC-10010 | Security | User A로 인증 후 User B의 automations UPDATE 시도 | 업데이트 0건 |

### US-1003: Go Worker service_role 접근

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10011 | Integration | service_role 키로 모든 사용자 automations 조회 | 전체 데이터 반환 (RLS 바이패스) |
| TC-10012 | Integration | service_role 키로 execution_logs INSERT | 정상 삽입 |

### US-1004: Webhook HMAC 검증

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10013 | Security | 유효한 HMAC 서명이 포함된 Webhook | 200 응답, 태스크 생성 |
| TC-10014 | Security | HMAC 서명 누락 Webhook | 401 응답 |
| TC-10015 | Security | 잘못된 HMAC 서명 Webhook | 401 응답 |

### US-1005: Rate Limiting

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10016 | Security | 동일 IP에서 1분 내 100회 API 호출 | 한도 초과 시 429 응답 |
| TC-10017 | Security | 동일 사용자로 1분 내 과도한 자동화 생성 | 한도 초과 시 429 응답 |

### US-1006: 민감 정보 마스킹

| TC ID | 유형 | 테스트 케이스 | 기대 결과 |
|-------|------|-------------|----------|
| TC-10018 | Unit | 실행 로그 output에 이메일 주소 포함 | 이메일 마스킹 (j***@gmail.com) |
| TC-10019 | Unit | tool_calls에 access_token 포함 | 토큰 마스킹 (sk-ant-***) |
| TC-10020 | Unit | 로그에 비밀번호/API 키가 포함되지 않음 | 민감 필드 자동 제외 |

---

## 테스트 케이스 요약

| Epic | 테스트 수 | Unit | Integration | E2E | Security |
|------|----------|------|-------------|-----|----------|
| 1. 인증 & 온보딩 | 19 | 0 | 2 | 17 | 0 |
| 2. 서비스 연결 | 16 | 3 | 7 | 6 | 0 |
| 3. 자동화 관리 | 21 | 1 | 3 | 17 | 0 |
| 4. 자동화 템플릿 | 15 | 0 | 15 | 0 | 0 |
| 5. 실행 엔진 | 24 | 11 | 13 | 0 | 0 |
| 6. 로그 & 모니터링 | 11 | 0 | 1 | 10 | 0 |
| 7. 설정 & 개인화 | 14 | 1 | 3 | 10 | 0 |
| 8. 결제 & 사용량 | 11 | 0 | 7 | 4 | 0 |
| 9. 랜딩 페이지 | 6 | 0 | 0 | 6 | 0 |
| 10. 보안 & 인프라 | 20 | 6 | 2 | 0 | 12 |
| **합계** | **157** | **22** | **53** | **70** | **12** |
