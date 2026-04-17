/**
 * Merges recent copilot chat with the latest edit instruction so the site generator
 * can resolve short commands ("add this", "put it in the hero") like Cursor-style context.
 */

export type BuilderChatMsgLite = { role: string; text: string };

/**
 * For structured parsing (brand, palette, sections), use only the current edit line — not the
 * whole RECENT CHAT block — so extractBrandName / sections are not polluted by assistant replies.
 */
export function stripIterationContextForPromptParse(raw: string): string {
  const t = raw.trim();
  const m = /\n(?:CURRENT EDIT|CURRENT REQUEST):\s*\n?([\s\S]*)$/i.exec(t);
  if (m?.[1]) return m[1].trim();
  return t;
}

/**
 * Builds the full string sent to `/api/3d-builder/generate-site` on iterations.
 * Caps length to the same limit as a single chat message for the user’s plan.
 */
export function buildSiteIterationPrompt(
  latestUserMessage: string,
  recentMessages: BuilderChatMsgLite[],
  maxChars: number,
): string {
  const cur = latestUserMessage.trim();
  if (!cur) return cur;

  const filtered = recentMessages.filter((m) => m.role === 'user' || m.role === 'assistant');
  const lines: string[] = [];
  for (const m of filtered.slice(-18)) {
    const t = (m.text || '').replace(/\s+/g, ' ').trim().slice(0, 360);
    if (!t) continue;
    lines.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${t}`);
  }
  const history = lines.join('\n');
  const head =
    'RECENT CHAT (resolve references like "this", "that section", "the image I uploaded"):\n';
  const sep = '\n\nCURRENT EDIT:\n';

  const combined = `${head}${history}${sep}${cur}`;
  if (combined.length <= maxChars) return combined;

  const reserve = Math.min(cur.length + sep.length + head.length, maxChars);
  const histBudget = maxChars - reserve;
  if (histBudget < 48) return cur.slice(0, maxChars);

  let h = history;
  if (h.length > histBudget - 4) {
    h = '…\n' + history.slice(Math.max(0, history.length - histBudget + 10));
  }
  return `${head}${h}${sep}${cur}`.slice(0, maxChars);
}
