// Package gmail provides an MCP tool client for Gmail API operations.
package gmail

import (
	"context"
	"encoding/base64"
	"fmt"

	gmailapi "google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
	"golang.org/x/oauth2"
)

// Email represents a Gmail message with parsed fields.
type Email struct {
	ID      string
	From    string
	Subject string
	Snippet string
	Date    string
}

// Client wraps the Gmail API with an OAuth access token.
type Client struct {
	token   string
	svcOpts []option.ClientOption // allows injection of test endpoint/transport
}

// New creates a Gmail client with the given OAuth access token.
func New(token string) *Client {
	return &Client{token: token}
}

// newWithOptions creates a client with additional Google API options (for testing).
func newWithOptions(token string, opts ...option.ClientOption) *Client {
	return &Client{token: token, svcOpts: opts}
}

func (c *Client) service(ctx context.Context) (*gmailapi.Service, error) {
	if len(c.svcOpts) > 0 {
		return gmailapi.NewService(ctx, c.svcOpts...)
	}
	return gmailapi.NewService(ctx, option.WithTokenSource(
		oauth2.StaticTokenSource(&oauth2.Token{AccessToken: c.token}),
	))
}

// ReadInbox returns the most recent emails from the user's inbox.
func (c *Client) ReadInbox(ctx context.Context, maxResults int) ([]Email, error) {
	svc, err := c.service(ctx)
	if err != nil {
		return nil, err
	}
	list, err := svc.Users.Messages.List("me").MaxResults(int64(maxResults)).Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	return c.fetchMessages(ctx, svc, list.Messages)
}

// SendEmail sends an email from the authenticated user's account.
func (c *Client) SendEmail(ctx context.Context, to, subject, body string) error {
	svc, err := c.service(ctx)
	if err != nil {
		return err
	}
	raw := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s", to, subject, body)
	msg := &gmailapi.Message{
		Raw: base64.URLEncoding.EncodeToString([]byte(raw)),
	}
	_, err = svc.Users.Messages.Send("me", msg).Context(ctx).Do()
	return err
}

// SearchEmail returns emails matching the given Gmail search query.
func (c *Client) SearchEmail(ctx context.Context, query string) ([]Email, error) {
	svc, err := c.service(ctx)
	if err != nil {
		return nil, err
	}
	list, err := svc.Users.Messages.List("me").Q(query).Context(ctx).Do()
	if err != nil {
		return nil, err
	}
	return c.fetchMessages(ctx, svc, list.Messages)
}

func (c *Client) fetchMessages(ctx context.Context, svc *gmailapi.Service, refs []*gmailapi.Message) ([]Email, error) {
	emails := make([]Email, 0, len(refs))
	for _, ref := range refs {
		msg, err := svc.Users.Messages.Get("me", ref.Id).Context(ctx).Do()
		if err != nil {
			return nil, err
		}
		emails = append(emails, parseEmail(msg))
	}
	return emails, nil
}

func parseEmail(msg *gmailapi.Message) Email {
	email := Email{
		ID:      msg.Id,
		Snippet: msg.Snippet,
	}
	if msg.Payload != nil {
		for _, h := range msg.Payload.Headers {
			switch h.Name {
			case "From":
				email.From = h.Value
			case "Subject":
				email.Subject = h.Value
			case "Date":
				email.Date = h.Value
			}
		}
	}
	return email
}
