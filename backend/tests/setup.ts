// Runs before the test framework loads any test file.

process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.ANTHROPIC_API_KEY = 'test-key-do-not-use-in-production';
