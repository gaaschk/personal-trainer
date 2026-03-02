import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from '@/lib/settings';

let _client: Anthropic | null = null;
let _clientKey = '';

/**
 * Returns a (potentially cached) Anthropic client backed by the current
 * ANTHROPIC_API_KEY from the DB or env.  Recreates the client if the key
 * has changed since the last call (e.g. admin updated it).
 */
export async function getAnthropicClient(): Promise<Anthropic> {
  const apiKey = (await getSetting('ANTHROPIC_API_KEY')) ?? '';
  if (_client && _clientKey === apiKey) return _client;
  _client = new Anthropic({ apiKey });
  _clientKey = apiKey;
  return _client;
}
