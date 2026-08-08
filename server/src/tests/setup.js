// Vitest bypasses src/index.js (the real entrypoint, which does `import
// "dotenv/config"` as its very first line) and imports app.js/controllers
// directly. Without this, .env only gets loaded as an incidental side effect
// of Prisma's own client instantiation — which happens too late relative to
// config.js's one-time evaluation, silently leaving config values like
// `showDevOtp` stuck at their no-env-var defaults regardless of .env content.
// Loading dotenv here (a Vitest setupFile, guaranteed to run before every
// test file's own imports) matches the real server's load order exactly.
import "dotenv/config";
