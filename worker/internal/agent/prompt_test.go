package agent

import (
	"strings"
	"testing"
)

func TestBuildSystemPrompt_OutputFormat(t *testing.T) {
	tests := []struct {
		name           string
		outputFormat   string
		wantContains   string
		wantNoContains bool // if true, wantContains should NOT be in output
	}{
		{
			name:         "email output format",
			outputFormat: "email",
			wantContains: "Output format: email",
		},
		{
			name:         "notion output format",
			outputFormat: "notion",
			wantContains: "Output format: notion",
		},
		{
			name:         "both output format",
			outputFormat: "both",
			wantContains: "Output format: both",
		},
		{
			name:           "empty output format omits line",
			outputFormat:   "",
			wantContains:   "Output format:",
			wantNoContains: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			profile := UserProfile{
				Timezone:          "Asia/Seoul",
				PreferredLanguage: "ko",
				OutputFormat:      tt.outputFormat,
			}
			result := buildSystemPrompt(profile, "morning_briefing")

			if tt.wantNoContains {
				if strings.Contains(result, tt.wantContains) {
					t.Errorf("expected prompt NOT to contain %q, but it did.\nGot:\n%s", tt.wantContains, result)
				}
			} else {
				if !strings.Contains(result, tt.wantContains) {
					t.Errorf("expected prompt to contain %q, but it did not.\nGot:\n%s", tt.wantContains, result)
				}
			}
		})
	}
}

func TestBuildSystemPrompt_ExistingBehavior(t *testing.T) {
	profile := UserProfile{
		Timezone:          "America/New_York",
		PreferredLanguage: "en",
		NewsCategories:    "technology,science",
	}
	result := buildSystemPrompt(profile, "morning_briefing")

	if !strings.Contains(result, "User timezone: America/New_York") {
		t.Error("expected timezone in prompt")
	}
	if !strings.Contains(result, "Preferred language: en") {
		t.Error("expected language in prompt")
	}
	if !strings.Contains(result, "news/category: technology, science") {
		t.Error("expected news categories in prompt")
	}
}
