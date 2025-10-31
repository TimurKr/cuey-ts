/**
 * Tests for the main Cuey client class
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { Cuey } from "../src/client";
import { getTestClient, isTestApiKeyAvailable, TEST_API_KEY } from "./setup";

describe("Cuey Client", () => {
  test("requires TEST_API_KEY environment variable", () => {
    expect(TEST_API_KEY).toBeDefined();
    expect(TEST_API_KEY).not.toBe("");
  });

  describe("Client Initialization", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should create client with explicit apiKey",
      () => {
        const client = new Cuey({
          apiKey: TEST_API_KEY!,
        });

        expect(client).toBeInstanceOf(Cuey);
        expect(client.crons).toBeDefined();
        expect(client.events).toBeDefined();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create client with apiKey and baseUrl",
      () => {
        const client = new Cuey({
          apiKey: TEST_API_KEY!,
          baseUrl: "https://example.com",
        });

        expect(client).toBeInstanceOf(Cuey);
        expect(client.webhookBaseUrl).toBe("https://example.com");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create client with environment variable apiKey",
      () => {
        // Save original env var
        const originalKey = process.env.CUEY_API_KEY;
        process.env.CUEY_API_KEY = TEST_API_KEY!;

        try {
          const client = new Cuey();
          expect(client).toBeInstanceOf(Cuey);
        } finally {
          // Restore original env var
          if (originalKey) {
            process.env.CUEY_API_KEY = originalKey;
          } else {
            delete process.env.CUEY_API_KEY;
          }
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create client with environment variable baseUrl",
      () => {
        const originalBaseUrl = process.env.CUEY_BASE_URL;
        process.env.CUEY_BASE_URL = "https://custom.example.com";

        try {
          const client = new Cuey({
            apiKey: TEST_API_KEY!,
          });
          expect(client.webhookBaseUrl).toBe("https://custom.example.com");
        } finally {
          if (originalBaseUrl) {
            process.env.CUEY_BASE_URL = originalBaseUrl;
          } else {
            delete process.env.CUEY_BASE_URL;
          }
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should prioritize config baseUrl over environment variable",
      () => {
        const originalBaseUrl = process.env.CUEY_BASE_URL;
        process.env.CUEY_BASE_URL = "https://env.example.com";

        try {
          const client = new Cuey({
            apiKey: TEST_API_KEY!,
            baseUrl: "https://config.example.com",
          });
          expect(client.webhookBaseUrl).toBe("https://config.example.com");
        } finally {
          if (originalBaseUrl) {
            process.env.CUEY_BASE_URL = originalBaseUrl;
          } else {
            delete process.env.CUEY_BASE_URL;
          }
        }
      },
    );
  });

  describe("Convenience Methods", () => {
    let client: Cuey;

    beforeAll(() => {
      if (!isTestApiKeyAvailable()) return;
      client = getTestClient();
    });

    test.skipIf(!isTestApiKeyAvailable())(
      "schedule() should create an event",
      async () => {
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 1);

        const event = await client.schedule({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate.toISOString(),
        });

        expect(event).toHaveProperty("id");
        expect(event.webhook_url).toBe("https://example.com/webhook");
        expect(event.method).toBe("POST");
        expect(event.status).toBe("pending");

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore cleanup errors
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "repeat() should create a cron job",
      async () => {
        const cron = await client.repeat({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
          is_active: true,
        });

        expect(cron).toHaveProperty("id");
        expect(cron.webhook_url).toBe("https://example.com/webhook");
        expect(cron.method).toBe("POST");
        expect(cron.cron_expression).toBe("0 0 * * *");
        expect(cron.is_active).toBe(true);

        // Cleanup
        try {
          await client.crons.delete(cron.id);
        } catch {
          // Ignore cleanup errors
        }
      },
    );
  });

  describe("Error Handling", () => {
    test("should throw error when apiKey is missing", async () => {
      // Create a client without API key by using a temporary clean environment
      const originalKey = process.env.CUEY_API_KEY;

      // Temporarily remove API keys from environment
      delete process.env.CUEY_API_KEY;

      try {
        const client = new Cuey();
        // Trigger API key resolution by trying to use it
        await expect(client.events.list()).rejects.toThrow(
          "API key is required",
        );
      } finally {
        // Restore original values
        if (originalKey) {
          process.env.CUEY_API_KEY = originalKey;
        }
      }
    });

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw error with invalid API key",
      async () => {
        const client = new Cuey({
          apiKey: "invalid-api-key",
        });

        await expect(client.events.list()).rejects.toThrow();
      },
    );
  });
});
