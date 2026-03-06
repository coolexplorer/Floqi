// Package calendar provides an MCP tool client for Google Calendar API operations.
package calendar

import (
	"context"
	"strings"
	"time"

	calapi "google.golang.org/api/calendar/v3"
	"golang.org/x/oauth2"
	"google.golang.org/api/option"
)

// Event represents a Google Calendar event with parsed fields.
type Event struct {
	ID       string
	Summary  string
	Start    time.Time
	End      time.Time
	Location string
}

// Client wraps the Google Calendar API with an OAuth access token.
type Client struct {
	token   string
	svcOpts []option.ClientOption // allows injection of test endpoint/transport
}

// New creates a Calendar client with the given OAuth access token.
func New(token string) *Client {
	return &Client{token: token}
}

// newWithOptions creates a client with additional Google API options (for testing).
func newWithOptions(token string, opts ...option.ClientOption) *Client {
	return &Client{token: token, svcOpts: opts}
}

func (c *Client) service(ctx context.Context) (*calapi.Service, error) {
	var svc *calapi.Service
	var err error
	if len(c.svcOpts) > 0 {
		svc, err = calapi.NewService(ctx, c.svcOpts...)
	} else {
		svc, err = calapi.NewService(ctx, option.WithTokenSource(
			oauth2.StaticTokenSource(&oauth2.Token{AccessToken: c.token}),
		))
	}
	if err != nil {
		return nil, err
	}
	// The Calendar library's default BasePath includes /calendar/v3/, but when
	// option.WithEndpoint is used with a bare URL (e.g. test server), that prefix
	// is lost. Ensure BasePath always ends with /calendar/v3/.
	base := strings.TrimRight(svc.BasePath, "/")
	if !strings.HasSuffix(base, "/calendar/v3") {
		svc.BasePath = base + "/calendar/v3/"
	}
	return svc, nil
}

// ListEvents returns calendar events between timeMin and timeMax.
func (c *Client) ListEvents(ctx context.Context, timeMin, timeMax time.Time) ([]Event, error) {
	svc, err := c.service(ctx)
	if err != nil {
		return nil, err
	}
	list, err := svc.Events.List("primary").
		TimeMin(timeMin.Format(time.RFC3339)).
		TimeMax(timeMax.Format(time.RFC3339)).
		Context(ctx).
		Do()
	if err != nil {
		return nil, err
	}

	events := make([]Event, 0, len(list.Items))
	for _, item := range list.Items {
		e := Event{
			ID:       item.Id,
			Summary:  item.Summary,
			Location: item.Location,
		}
		if item.Start != nil && item.Start.DateTime != "" {
			e.Start, _ = time.Parse(time.RFC3339, item.Start.DateTime)
		}
		if item.End != nil && item.End.DateTime != "" {
			e.End, _ = time.Parse(time.RFC3339, item.End.DateTime)
		}
		events = append(events, e)
	}
	return events, nil
}

// CreateEvent creates a new calendar event with the given summary, start, and end times.
func (c *Client) CreateEvent(ctx context.Context, summary string, start, end time.Time) (*Event, error) {
	svc, err := c.service(ctx)
	if err != nil {
		return nil, err
	}
	req := &calapi.Event{
		Summary: summary,
		Start:   &calapi.EventDateTime{DateTime: start.Format(time.RFC3339)},
		End:     &calapi.EventDateTime{DateTime: end.Format(time.RFC3339)},
	}
	created, err := svc.Events.Insert("primary", req).Context(ctx).Do()
	if err != nil {
		return nil, err
	}

	result := &Event{
		ID:       created.Id,
		Summary:  created.Summary,
		Location: created.Location,
	}
	if created.Start != nil && created.Start.DateTime != "" {
		result.Start, _ = time.Parse(time.RFC3339, created.Start.DateTime)
	}
	if created.End != nil && created.End.DateTime != "" {
		result.End, _ = time.Parse(time.RFC3339, created.End.DateTime)
	}
	return result, nil
}
