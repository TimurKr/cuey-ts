/**
 * Test setup and configuration
 *
 * This file handles:
 * - API key validation from environment variable
 * - Test client initialization
 * - Shared test utilities
 */

import { Cuey } from "../src/client";

/**
 * Test API key from environment variable
 * Tests will skip if this is not set
 */
export const TEST_API_KEY = process.env.TEST_API_KEY;

/**
 * Check if TEST_API_KEY is available
 * All tests should check this before running
 */
export function isTestApiKeyAvailable(): boolean {
  return !!TEST_API_KEY;
}

/**
 * Get test client instance configured with TEST_API_KEY
 * Throws if TEST_API_KEY is not available
 */
export function getTestClient(): Cuey {
  if (!TEST_API_KEY) {
    throw new Error(
      "TEST_API_KEY environment variable is required. " +
        "Please set it in .env.local file. " +
        "See README.md for testing instructions.",
    );
  }

  return new Cuey({
    apiKey: TEST_API_KEY,
    baseUrl: "https://example.com", // For testing relative webhook URLs
  });
}

/**
 * Helper to create a future scheduled_at timestamp
 */
export function getFutureDate(hoursFromNow: number = 1): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

/**
 * Normalize ISO date string for comparison (converts +00:00 to Z)
 * Both formats are valid ISO 8601 UTC representations
 */
export function normalizeISOString(dateStr: string): string {
  if (!dateStr) return dateStr;
  // Replace +00:00 with Z (both represent UTC)
  return dateStr.replace(/\+00:00$/, "Z");
}

/**
 * Compare two ISO date strings, handling both Z and +00:00 formats
 * Both formats represent UTC and should be considered equal
 */
export function expectISOStringEqual(actual: string, expected: string): void {
  // Convert both to Date objects for comparison (handles both Z and +00:00 formats)
  const actualDate = new Date(actual);
  const expectedDate = new Date(expected);

  if (actualDate.getTime() !== expectedDate.getTime()) {
    throw new Error(
      `ISO date strings do not represent the same time. ` +
        `Expected: "${expected}" (${expectedDate.toISOString()}), ` +
        `Got: "${actual}" (${actualDate.toISOString()})`,
    );
  }
  // If dates are equal, the strings are functionally equivalent
}

/**
 * Helper to create a UUID-like string for testing
 */
export function createTestId(): string {
  return `00000000-0000-0000-0000-${Math.random().toString(36).substr(2, 12)}`;
}

/**
 * Helper to skip tests when API key is not available
 * Use this as a test modifier: test.skipIf(!isTestApiKeyAvailable())("test name", ...)
 */
export function skipIfApiKeyUnavailable(): boolean {
  return !isTestApiKeyAvailable();
}
