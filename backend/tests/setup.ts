// Runs before the test framework loads any test file. auth.ts throws at
// import time if JWT_SECRET is missing, so this has to be set here rather
// than in a beforeAll hook.
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
