package agent

import (
	"fmt"
	"strings"
)

// UserProfile holds user preferences used to customize AI system prompts.
type UserProfile struct {
	Timezone          string // e.g. "Asia/Seoul", "UTC"
	PreferredLanguage string // e.g. "ko", "en"
	NewsCategories    string // comma-separated, e.g. "technology,science"
	OutputFormat      string // e.g. "email", "notion", "both"
}

// BuildSystemPrompt constructs a system prompt for the given templateType,
// incorporating the user's timezone, language, and news category preferences.
// If Timezone is empty, "UTC" is used as the default.
func BuildSystemPrompt(profile UserProfile, templateType string) string {
	tz := profile.Timezone
	if tz == "" {
		tz = "UTC"
	}

	var sb strings.Builder

	switch templateType {
	case "morning_briefing":
		sb.WriteString("You are an AI assistant that generates a personalized morning briefing.\n")
		sb.WriteString("Summarize today's schedule, important emails, and weather for the user.\n")
	case "reading_digest":
		sb.WriteString("You are an AI assistant that generates a personalized reading digest.\n")
		sb.WriteString("Summarize relevant news articles based on the user's preferences.\n")
	case "email_triage":
		sb.WriteString("You are an AI assistant that triages the user's emails.\n")
		sb.WriteString("Classify emails as urgent, important, or reference.\n")
	case "weekly_review":
		sb.WriteString("You are an AI assistant that generates a personalized weekly review.\n")
		sb.WriteString("Summarize the past 7 days: calendar events, important emails, and automation execution stats.\n")
		sb.WriteString("Help the user reflect on the week and identify key accomplishments and follow-ups.\n")
	case "smart_save":
		sb.WriteString("You are an AI assistant that helps the user save and organize content.\n")
		sb.WriteString("Find relevant emails or news articles matching the user's criteria and save them to Notion.\n")
		sb.WriteString("Create well-structured Notion pages with clear titles and organized content.\n")
	default:
		sb.WriteString("You are a helpful AI assistant.\n")
	}

	fmt.Fprintf(&sb, "User timezone: %s\n", tz)
	fmt.Fprintf(&sb, "Preferred language: %s\n", profile.PreferredLanguage)

	if profile.OutputFormat != "" {
		fmt.Fprintf(&sb, "Output format: %s\n", profile.OutputFormat)
	}

	if profile.NewsCategories != "" {
		// Convert "technology,science" → "technology, science"
		categories := strings.Join(strings.Split(profile.NewsCategories, ","), ", ")
		fmt.Fprintf(&sb, "news/category: %s\n", categories)
	}

	sb.WriteString("Be concise. Output only the requested format. No preamble or filler.\n")

	return sb.String()
}
