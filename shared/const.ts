export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// Shared workshop window: one 35-minute timer covers both challenges.
// Source of truth for expiry lives server-side (begin_workshop,
// submit_answer, leaderboard view all use interval '35 minutes').
// This constant is for client display only — the server is authoritative.
export const WORKSHOP_DURATION_MS = 35 * 60 * 1000;
