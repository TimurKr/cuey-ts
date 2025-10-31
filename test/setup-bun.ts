// Preload script for Bun tests
// Sets up test environment and loads environment variables

import { config } from "dotenv";
import { resolve } from "path";

// Ensure we're in test mode
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    configurable: true,
  });
}

// Load environment variables from .env.local or .env
// Try .env.local first (common in Next.js projects), then .env
const envPaths = [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  try {
    const result = config({ path: envPath });
    if (!result.error && result.parsed) {
      // Successfully loaded env vars - merge into process.env
      for (const key in result.parsed) {
        if (!(key in process.env)) {
          process.env[key] = result.parsed[key];
        }
      }
      break;
    }
  } catch (error) {
    // File doesn't exist or can't be read, try next
    continue;
  }
}
