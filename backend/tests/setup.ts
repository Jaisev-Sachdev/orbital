// Runs before the test framework loads any test file.
// - auth.ts throws at import time if JWT_SECRET is missing.
// - recommendations.ts throws at import time if ANTHROPIC_API_KEY is missing.
// Both routers are wired up in src/app.ts, which every test file imports
// transitively, so these have to be set here rather than in a beforeAll hook.
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.ANTHROPIC_API_KEY = 'test-key-do-not-use-in-production';
