package agent

// TC-7003, TC-7010: 사용자 타임존/선호도 → AI 시스템 프롬프트 통합 테스트 (TDD Red Phase)
// US-701: 프로필 설정에서 변경된 타임존이 AI 실행에 반영된다.
// US-703: 사용자 선호도가 AI 시스템 프롬프트에 포함된다.
//
// 구현 요구사항:
//   - UserProfile 타입:
//     - Timezone string           // 예: "Asia/Seoul", "UTC"
//     - PreferredLanguage string  // 예: "ko", "en"
//     - NewsCategories string     // 예: "technology,science"
//   - BuildSystemPrompt(profile UserProfile, templateType string) string
//     - TC-7003: profile.Timezone = "Asia/Seoul" → 결과에 "User timezone: Asia/Seoul" 포함
//     - TC-7010: profile.NewsCategories = "technology,science" → 결과에 "news/category: technology, science" 포함
//     - templateType에 따라 프롬프트 내용이 달라짐
//     - Timezone이 빈 문자열이면 "UTC"를 기본값으로 사용
//
// FAILURES expected (Red phase):
//   - UserProfile 타입 미정의 → 컴파일 에러
//   - BuildSystemPrompt 함수 미구현 → 컴파일 에러

import (
	"strings"
	"testing"
)

// ── TC-7003: 타임존 → AI 프롬프트 반영 ──────────────────────────────────────

// TC-7003: timezone = "Asia/Seoul" → BuildSystemPrompt에 "User timezone: Asia/Seoul" 포함
func TestBuildSystemPrompt_TimezoneAsiaSoul(t *testing.T) {
	// EXPECT: UserProfile 타입이 정의되어 있음
	// ACTUAL: 미정의 → 컴파일 에러
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}

	// EXPECT: BuildSystemPrompt 함수가 정의되어 있음
	// ACTUAL: 미구현 → 컴파일 에러
	prompt := BuildSystemPrompt(profile, "morning_briefing")

	if !strings.Contains(prompt, "User timezone: Asia/Seoul") {
		t.Errorf("TC-7003: prompt does not contain 'User timezone: Asia/Seoul'\nprompt: %q", prompt)
	}
}

// TC-7003: timezone = "America/New_York" → prompt에 해당 timezone 포함
func TestBuildSystemPrompt_TimezoneNewYork(t *testing.T) {
	profile := UserProfile{
		Timezone:          "America/New_York",
		PreferredLanguage: "en",
	}

	prompt := BuildSystemPrompt(profile, "morning_briefing")

	if !strings.Contains(prompt, "User timezone: America/New_York") {
		t.Errorf("TC-7003: prompt does not contain 'User timezone: America/New_York'\nprompt: %q", prompt)
	}
}

// TC-7003: timezone = "" (미설정) → "UTC"를 기본값으로 사용
func TestBuildSystemPrompt_EmptyTimezone_DefaultsToUTC(t *testing.T) {
	profile := UserProfile{
		Timezone:          "", // 미설정
		PreferredLanguage: "en",
	}

	prompt := BuildSystemPrompt(profile, "morning_briefing")

	// 빈 타임존이면 UTC 기본값 사용
	if !strings.Contains(prompt, "User timezone: UTC") {
		t.Errorf("TC-7003: empty timezone should default to UTC\nprompt: %q", prompt)
	}
}

// TC-7003: resolveLLMConfig 완료 후 BuildSystemPrompt가 올바르게 동작 (통합)
func TestBuildSystemPrompt_IntegratesWithLLMConfig(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}
	llmConfig := LLMConfig{Mode: "managed"}
	managedKey := "sk-ant-managed"

	// LLMConfig 해소
	key, err := resolveLLMConfig(llmConfig, func(s string) (string, error) { return "", nil }, managedKey)
	if err != nil {
		t.Fatalf("TC-7003: resolveLLMConfig error: %v", err)
	}
	if key == "" {
		t.Fatal("TC-7003: resolved LLM key is empty")
	}

	// 타임존이 프롬프트에 포함되어야 함
	prompt := BuildSystemPrompt(profile, "morning_briefing")
	if !strings.Contains(prompt, "Asia/Seoul") {
		t.Errorf("TC-7003: prompt missing timezone after LLM config resolution\nprompt: %q", prompt)
	}
}

// TC-7003: BuildSystemPrompt 결과가 비어 있지 않음
func TestBuildSystemPrompt_ReturnsNonEmptyPrompt(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}

	prompt := BuildSystemPrompt(profile, "morning_briefing")

	if prompt == "" {
		t.Error("TC-7003: BuildSystemPrompt returned empty string")
	}
}

// ── TC-7010: 선호도 → AI 시스템 프롬프트 반영 ────────────────────────────────

// TC-7010: news_categories = "technology,science" → prompt에 "news/category: technology, science" 포함
func TestBuildSystemPrompt_NewsCategories_InPrompt(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
		NewsCategories:    "technology,science",
	}

	// EXPECT: "news/category: technology, science" 포함 (TC-7010 기대 결과)
	// ACTUAL: BuildSystemPrompt 미구현 → 컴파일 에러
	prompt := BuildSystemPrompt(profile, "reading_digest")

	if !strings.Contains(prompt, "news/category: technology, science") {
		t.Errorf("TC-7010: prompt does not contain 'news/category: technology, science'\nprompt: %q", prompt)
	}
}

// TC-7010: preferred_language = "ko" → prompt에 언어 설정 포함
func TestBuildSystemPrompt_PreferredLanguageKorean(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}

	prompt := BuildSystemPrompt(profile, "morning_briefing")

	// "ko" 또는 "Korean" 중 하나가 포함되어야 함
	if !strings.Contains(prompt, "ko") && !strings.Contains(prompt, "Korean") {
		t.Errorf("TC-7010: prompt does not contain preferred language info\nprompt: %q", prompt)
	}
}

// TC-7010: preferred_language = "en" → prompt에 영어 설정 포함
func TestBuildSystemPrompt_PreferredLanguageEnglish(t *testing.T) {
	profile := UserProfile{
		Timezone:          "America/New_York",
		PreferredLanguage: "en",
	}

	prompt := BuildSystemPrompt(profile, "morning_briefing")

	if !strings.Contains(prompt, "en") && !strings.Contains(prompt, "English") {
		t.Errorf("TC-7010: prompt does not contain language preference for 'en'\nprompt: %q", prompt)
	}
}

// TC-7010: 빈 선호도 → 패닉 없이 기본 프롬프트 반환
func TestBuildSystemPrompt_EmptyPreferences_NoError(t *testing.T) {
	profile := UserProfile{
		Timezone:          "UTC",
		PreferredLanguage: "",
		NewsCategories:    "",
	}

	defer func() {
		if r := recover(); r != nil {
			t.Errorf("TC-7010: BuildSystemPrompt panicked with empty preferences: %v", r)
		}
	}()

	prompt := BuildSystemPrompt(profile, "morning_briefing")
	if prompt == "" {
		t.Error("TC-7010: BuildSystemPrompt returned empty string for empty preferences")
	}
}

// TC-7010: templateType에 따라 서로 다른 프롬프트를 생성한다
func TestBuildSystemPrompt_DifferentTemplates_DifferentPrompts(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "en",
		NewsCategories:    "technology",
	}

	morningPrompt := BuildSystemPrompt(profile, "morning_briefing")
	digestPrompt := BuildSystemPrompt(profile, "reading_digest")

	// 다른 템플릿은 서로 다른 프롬프트를 생성해야 함
	if morningPrompt == digestPrompt {
		t.Error("TC-7010: different template types should produce different system prompts")
	}
}

// TC-7010: 모든 선호도(timezone, language, categories)가 한 번에 포함됨을 종합 검증
func TestBuildSystemPrompt_AllPreferences_Included(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
		NewsCategories:    "technology,science",
	}

	prompt := BuildSystemPrompt(profile, "reading_digest")

	checks := []struct {
		name    string
		keyword string
	}{
		{"timezone", "Asia/Seoul"},
		{"news/category format", "news/category: technology, science"},
	}

	for _, c := range checks {
		if !strings.Contains(prompt, c.keyword) {
			t.Errorf("TC-7010: prompt missing %s (%q)\nprompt: %q", c.name, c.keyword, prompt)
		}
	}
}
