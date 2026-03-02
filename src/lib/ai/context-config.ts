/**
 * Sliding-window + summarization thresholds.
 *
 * Each "message" is one DB row (USER or ASSISTANT).  One full exchange = 2 rows.
 *
 * Recommended starting values for 1–50 users:
 *   CHAT_WINDOW_SIZE    = 20   →  10 back-and-forth turns kept verbatim (~10k tokens)
 *   CHAT_SUMMARY_TRIGGER = 30  →  first summarization fires at turn 15, then every 5 turns
 *
 * Rule of thumb: TRIGGER must be > WINDOW.  A gap of ≥10 ensures summarization
 * always covers complete USER/ASSISTANT pairs and never fires mid-window.
 */

import { getSetting } from '@/lib/settings';

export async function getChatWindowSize(): Promise<number> {
  return parseInt((await getSetting('CHAT_WINDOW_SIZE')) ?? '20', 10);
}

export async function getChatSummaryTrigger(): Promise<number> {
  return parseInt((await getSetting('CHAT_SUMMARY_TRIGGER')) ?? '30', 10);
}
