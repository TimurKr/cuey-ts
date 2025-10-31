/**
 * Tests for edge cases and boundary conditions
 */

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { Cuey } from "../src/client";
import type { Cron, Event } from "../src/types/models";
import { InternalServerError } from "../src/types/errors";
import {
  cleanupAllCrons,
  cleanupAllPendingEvents,
  cleanupResources,
} from "./helpers";
import {
  expectISOStringEqual,
  getFutureDate,
  getTestClient,
  isTestApiKeyAvailable,
} from "./setup";

describe("Edge Cases and Boundary Conditions", () => {
  let client: Cuey;
  const createdEvents: Event[] = [];
  const createdCrons: Cron[] = [];

  beforeAll(async () => {
    if (!isTestApiKeyAvailable()) return;
    client = getTestClient();
    // Clean up all existing pending events and crons before running tests
    await cleanupAllPendingEvents(client);
    await cleanupAllCrons(client);
  });

  afterEach(async () => {
    if (!isTestApiKeyAvailable()) return;
    await cleanupResources(client, createdEvents, createdCrons);
    createdEvents.length = 0;
    createdCrons.length = 0;
  });

  afterAll(async () => {
    if (!isTestApiKeyAvailable()) return;
    // Clean up all pending events and crons after all tests complete
    await cleanupAllPendingEvents(client);
    await cleanupAllCrons(client);
  });

  describe("Pagination Limits", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle maximum pagination limit (1000)",
      async () => {
        const response = await client.events.list({ limit: 1000 });
        expect(response.pagination.limit).toBe(1000);
        expect(Array.isArray(response.data)).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle minimum pagination limit (1)",
      async () => {
        const event1 = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: getFutureDate(1),
        });
        createdEvents.push(event1);

        const response = await client.events.list({ limit: 1 });
        expect(response.pagination.limit).toBe(1);
        expect(response.data.length).toBeLessThanOrEqual(1);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())("should handle page 0", async () => {
      const response = await client.events.list({ page: 0 });
      expect(response.pagination.page).toBe(0);
    });

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw InternalServerError for out of range page numbers",
      async () => {
        // Requesting a page number that is out of range should throw InternalServerError
        await expect(client.events.list({ page: 100 })).rejects.toThrow(
          InternalServerError,
        );
      },
    );
  });

  describe("Webhook URL Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle long webhook URLs",
      async () => {
        const longUrl = "https://example.com/" + "a".repeat(200);
        const futureDate = getFutureDate(1);

        const event = await client.events.create({
          webhook_url: longUrl,
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe(longUrl);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle webhook URLs with query parameters",
      async () => {
        const urlWithQuery =
          "https://example.com/webhook?param1=value1&param2=value2";
        const futureDate = getFutureDate(1);

        const event = await client.events.create({
          webhook_url: urlWithQuery,
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe(urlWithQuery);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle webhook URLs with special characters",
      async () => {
        const urlWithSpecialChars =
          "https://example.com/webhook?param=value%20with%20spaces";
        const futureDate = getFutureDate(1);

        const event = await client.events.create({
          webhook_url: urlWithSpecialChars,
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe(urlWithSpecialChars);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle webhook URLs with ports",
      async () => {
        const urlWithPort = "https://example.com:8080/webhook";
        const futureDate = getFutureDate(1);

        const event = await client.events.create({
          webhook_url: urlWithPort,
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe(urlWithPort);
      },
    );
  });

  describe("Scheduled At Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle scheduled_at very far in future",
      async () => {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 10);

        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: farFuture.toISOString(),
        });
        createdEvents.push(event);

        expect(new Date(event.scheduled_at).getFullYear()).toBe(
          farFuture.getFullYear(),
        );
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle scheduled_at just in the future",
      async () => {
        const justFuture = new Date();
        justFuture.setSeconds(justFuture.getSeconds() + 5);

        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: justFuture.toISOString(),
        });
        createdEvents.push(event);

        expectISOStringEqual(event.scheduled_at, justFuture.toISOString());
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject scheduled_at exactly now",
      async () => {
        const now = new Date();

        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: now.toISOString(),
          }),
        ).rejects.toThrow();
      },
    );
  });

  describe("Payload Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle large payload objects",
      async () => {
        const largePayload = {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            data: "x".repeat(100),
          })),
        };

        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          payload: largePayload,
        });
        createdEvents.push(event);

        expect(event.payload).toEqual(largePayload);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle nested payload objects",
      async () => {
        const nestedPayload = {
          level1: {
            level2: {
              level3: {
                value: "deep",
              },
            },
          },
        };

        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          payload: nestedPayload,
        });
        createdEvents.push(event);

        expect(event.payload).toEqual(nestedPayload);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle array payloads",
      async () => {
        const arrayPayload = [1, 2, 3, { nested: "value" }, true];

        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          payload: arrayPayload,
        });
        createdEvents.push(event);

        expect(event.payload).toEqual(arrayPayload);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle null payload",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          payload: null,
        });
        createdEvents.push(event);

        expect(event.payload).toBeNull();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle empty object payload",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          payload: {},
        });
        createdEvents.push(event);

        expect(event.payload).toEqual({});
      },
    );
  });

  describe("Headers Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle headers with special characters",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          headers: {
            "X-Custom-Header": "value with spaces",
            "X-Another": "value:with:colons",
            "X-UTF8": "value with émojis 🎉",
          },
        });
        createdEvents.push(event);

        expect(event.headers).toEqual({
          "X-Custom-Header": "value with spaces",
          "X-Another": "value:with:colons",
          "X-UTF8": "value with émojis 🎉",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle empty headers object",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          headers: {},
        });
        createdEvents.push(event);

        // Empty object might be normalized to null by the API
        expect(
          event.headers === null ||
            Object.keys(event.headers || {}).length === 0,
        ).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle many headers",
      async () => {
        const headers: Record<string, string> = {};
        for (let i = 0; i < 20; i++) {
          headers[`X-Header-${i}`] = `value-${i}`;
        }

        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          headers,
        });
        createdEvents.push(event);

        expect(event.headers).toEqual(headers);
      },
    );
  });

  describe("Cron Expression Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle various valid cron expressions",
      async () => {
        const expressions = [
          "0 0 * * *", // Daily at midnight
          "0 * * * *", // Every hour
          "*/5 * * * *", // Every 5 minutes
          "0 9 * * 1-5", // Weekdays at 9 AM
          "0 0 1 * *", // First day of month
          "0 0 * * 0", // Sunday at midnight
        ];

        for (const expr of expressions) {
          const cron = await client.crons.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            cron_expression: expr,
          });
          createdCrons.push(cron);
          expect(cron.cron_expression).toBe(expr);
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle timezone variations",
      async () => {
        const timezones = [
          "UTC",
          "America/New_York",
          "America/Los_Angeles",
          "Europe/London",
          "Asia/Tokyo",
        ];

        for (const tz of timezones) {
          const cron = await client.crons.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            cron_expression: "0 0 * * *",
            timezone: tz,
          });
          createdCrons.push(cron);
          expect(cron.timezone).toBe(tz);
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle null timezone",
      async () => {
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
          timezone: null,
        });
        createdCrons.push(cron);

        // Null timezone should default to UTC or remain null
        expect(cron.timezone === null || cron.timezone === "UTC").toBe(true);
      },
    );
  });

  describe("Retry Config Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle minimum retry config values",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          retry_config: {
            maxRetries: 1,
            backoffMs: 100,
            backoffType: "linear",
          },
        });
        createdEvents.push(event);

        expect(event.retry_config).toEqual({
          maxRetries: 1,
          backoffMs: 100,
          backoffType: "linear",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle maximum retry config values",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          retry_config: {
            maxRetries: 10,
            backoffMs: 5000,
            backoffType: "exponential",
          },
        });
        createdEvents.push(event);

        expect(event.retry_config).toEqual({
          maxRetries: 10,
          backoffMs: 5000,
          backoffType: "exponential",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle null retry config",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          retry_config: null,
        });
        createdEvents.push(event);

        // Null retry_config should use defaults (may be null or have defaults)
        expect(
          event.retry_config === null || typeof event.retry_config === "object",
        ).toBe(true);
      },
    );
  });

  describe("Relative URL Edge Cases", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should handle relative URL with trailing slash in baseUrl",
      async () => {
        const clientWithBaseUrl = new Cuey({
          apiKey: process.env.TEST_API_KEY!,
          baseUrl: "https://example.com/",
        });

        const futureDate = getFutureDate(1);
        const event = await clientWithBaseUrl.events.create({
          webhook_url: "/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe("https://example.com/webhook");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should handle relative URL with query params",
      async () => {
        const clientWithBaseUrl = new Cuey({
          apiKey: process.env.TEST_API_KEY!,
          baseUrl: "https://example.com",
        });

        const futureDate = getFutureDate(1);
        const event = await clientWithBaseUrl.events.create({
          webhook_url: "/webhook?param=value",
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.webhook_url).toBe(
          "https://example.com/webhook?param=value",
        );
      },
    );
  });
});
