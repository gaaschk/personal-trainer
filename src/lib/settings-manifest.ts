/**
 * Settings manifest — safe to import from both server and client components.
 * Contains no server-side dependencies.
 */
export const SETTINGS_MANIFEST = {
  ANTHROPIC_API_KEY:    { secret: true,  restartRequired: false, label: 'Anthropic API Key' },
  ANTHROPIC_MODEL:      { secret: false, restartRequired: false, label: 'Anthropic Model' },
  CHAT_WINDOW_SIZE:     { secret: false, restartRequired: false, label: 'Chat Window Size' },
  CHAT_SUMMARY_TRIGGER: { secret: false, restartRequired: false, label: 'Chat Summary Trigger' },
  GOOGLE_CLIENT_ID:     { secret: false, restartRequired: true,  label: 'Google Client ID' },
  GOOGLE_CLIENT_SECRET: { secret: true,  restartRequired: true,  label: 'Google Client Secret' },
  APPLE_ID:             { secret: false, restartRequired: true,  label: 'Apple ID' },
  APPLE_SECRET:         { secret: true,  restartRequired: true,  label: 'Apple Secret' },
} as const;

export type SettingKey = keyof typeof SETTINGS_MANIFEST;
