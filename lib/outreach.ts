interface OutreachInput {
  name: string;
  category: string;
  city: string;
  rating: number | null;
  reviewCount: number | null;
}

function templateLine(lead: OutreachInput): string {
  const hasReviews = (lead.reviewCount ?? 0) > 0 && lead.rating;
  const reviewClause = hasReviews
    ? `You've got ${lead.reviewCount} Google reviews at a ${lead.rating!.toFixed(1)}★ average`
    : `I came across your business while looking at local ${lead.category.toLowerCase()}`;

  return (
    `Hey, I came across ${lead.name} while looking at ${lead.category.toLowerCase()} in ${lead.city}. ` +
    `${reviewClause} but I noticed you don't have a website attached to your listing. ` +
    `I'm a local web designer, so I mocked up what one could look like for you. Want me to send it over?`
  );
}

/**
 * Generates a personalized opening line for outreach. Uses Claude if
 * ANTHROPIC_API_KEY is configured for a sharper, more specific line;
 * otherwise falls back to a deterministic template (still solid on its own).
 */
export async function generateOpeningLine(lead: OutreachInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateLine(lead);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content:
              `Write one short, casual, non-salesy cold-outreach opening line (2-3 sentences max) ` +
              `from a local web designer to a business owner who has no website. ` +
              `Business: ${lead.name}, category: ${lead.category}, city: ${lead.city}, ` +
              `Google rating: ${lead.rating ?? 'unknown'}, review count: ${lead.reviewCount ?? 'unknown'}. ` +
              `Mention the rating/reviews as social proof if present, note the missing website naturally, ` +
              `and offer to send a free mockup. No greeting fluff like "I hope this finds you well." ` +
              `Return only the message text, nothing else.`,
          },
        ],
      }),
    });

    if (!res.ok) return templateLine(lead);
    const json = await res.json();
    const text = json?.content?.[0]?.text?.trim();
    return text || templateLine(lead);
  } catch {
    return templateLine(lead);
  }
}
