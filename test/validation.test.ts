/**
 * Tests for client-side validation
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { Cuey } from "../src/client";
import { ValidationError } from "../src/types/errors";
import { ALLOWED_HTTP_METHODS } from "../src/types/models";
import {
  expectISOStringEqual,
  getFutureDate,
  getTestClient,
  isTestApiKeyAvailable,
} from "./setup";

describe("Client-Side Validation", () => {
  let client: Cuey;

  beforeAll(() => {
    if (!isTestApiKeyAvailable()) return;
    client = getTestClient();
  });

  describe("Webhook URL Validation", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should accept full HTTP URL",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "http://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });

        expect(event.webhook_url).toBe("http://example.com/webhook");

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should accept full HTTPS URL",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });

        expect(event.webhook_url).toBe("https://example.com/webhook");

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should accept relative URL when baseUrl is configured",
      async () => {
        const clientWithBaseUrl = new Cuey({
          apiKey: process.env.TEST_API_KEY!,
          baseUrl: "https://example.com",
        });

        const futureDate = getFutureDate(1);
        const event = await clientWithBaseUrl.events.create({
          webhook_url: "/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });

        expect(event.webhook_url).toBe("https://example.com/webhook");

        // Cleanup
        try {
          await clientWithBaseUrl.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject relative URL when baseUrl is not configured",
      async () => {
        const clientNoBaseUrl = new Cuey({
          apiKey: process.env.TEST_API_KEY!,
        });

        const futureDate = getFutureDate(1);
        await expect(
          clientNoBaseUrl.events.create({
            webhook_url: "/webhook",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid URL format",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "not-a-url",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject empty URL",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject URL without protocol",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow(ValidationError);
      },
    );
  });

  describe("Retry Config Validation", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should accept valid retry config",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          retry_config: {
            maxRetries: 5,
            backoffMs: 1000,
            backoffType: "exponential",
          },
        });

        expect(event.retry_config).toEqual({
          maxRetries: 5,
          backoffMs: 1000,
          backoffType: "exponential",
        });

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject maxRetries below 1",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 0,
              backoffMs: 1000,
              backoffType: "exponential",
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject maxRetries above 10",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 11,
              backoffMs: 1000,
              backoffType: "exponential",
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject non-integer maxRetries",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 5.5,
              backoffMs: 1000,
              backoffType: "exponential",
            },
          } as any),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject backoffMs below 100",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 5,
              backoffMs: 99,
              backoffType: "exponential",
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject backoffMs above 5000",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 5,
              backoffMs: 5001,
              backoffType: "exponential",
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid backoffType",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            retry_config: {
              maxRetries: 5,
              backoffMs: 1000,
              backoffType: "invalid" as any,
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should accept linear backoffType",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          retry_config: {
            maxRetries: 3,
            backoffMs: 500,
            backoffType: "linear",
          },
        });

        expect(event.retry_config?.backoffType).toBe("linear");

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );
  });

  describe("Headers Validation", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should accept valid headers object",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          headers: {
            "X-Custom-Header": "value",
            Authorization: "Bearer token",
          },
        });

        expect(event.headers).toEqual({
          "X-Custom-Header": "value",
          Authorization: "Bearer token",
        });

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should accept null headers",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
          headers: null,
        });

        expect(event.headers).toBeNull();

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject non-string header values",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            headers: {
              "X-Header": 123 as any,
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject empty header keys",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
            headers: {
              "": "value",
            },
          }),
        ).rejects.toThrow(ValidationError);
      },
    );
  });

  describe("HTTP Method Validation", () => {
    for (const method of ALLOWED_HTTP_METHODS) {
      test.skipIf(!isTestApiKeyAvailable())(
        `should accept ${method} method`,
        async () => {
          const futureDate = getFutureDate(1);
          const event = await client.events.create({
            webhook_url: "https://example.com/webhook",
            method: method as any,
            scheduled_at: futureDate,
          });

          expect(event.method).toBe(method);

          // Cleanup
          try {
            await client.events.delete(event.id);
          } catch {
            // Ignore
          }
        },
      );
    }

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid HTTP method",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "INVALID" as any,
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow(ValidationError);
      },
    );
  });

  describe("Scheduled At Validation", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should accept valid future ISO timestamp",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });

        expectISOStringEqual(event.scheduled_at, futureDate);

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject past scheduled_at",
      async () => {
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: pastDate.toISOString(),
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject empty scheduled_at",
      async () => {
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: "",
          }),
        ).rejects.toThrow(ValidationError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid date format",
      async () => {
        await expect(
          client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: "not-a-date",
          }),
        ).rejects.toThrow(ValidationError);
      },
    );
  });
});
