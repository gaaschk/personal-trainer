import Anthropic from '@anthropic-ai/sdk';

const globalForAI = globalThis as unknown as { anthropic: Anthropic };

export const anthropic =
  globalForAI.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== 'production') globalForAI.anthropic = anthropic;
