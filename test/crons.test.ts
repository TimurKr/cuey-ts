/**
 * Tests for Crons resource
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { Cuey } from "../src/client";
import type { Cron } from "../src/types/models";
import {
  cleanupAllCrons,
  cleanupAllPendingEvents,
  cleanupResources,
  createTestCron,
} from "./helpers";
import { getTestClient, isTestApiKeyAvailable } from "./setup";

describe("Crons Resource", () => {
  let client: Cuey;
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
    await cleanupResources(client, [], createdCrons);
    createdCrons.length = 0;
  });

  afterAll(async () => {
    if (!isTestApiKeyAvailable()) return;
    // Clean up all pending events and crons after all tests complete
    await cleanupAllPendingEvents(client);
    await cleanupAllCrons(client);
  });

  describe("List Crons", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should return crons for authenticated team",
      async () => {
        const cron1 = await createTestCron(client);
        const cron2 = await createTestCron(client);
        createdCrons.push(cron1, cron2);

        const response = await client.crons.list();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.pagination.total).toBeGreaterThanOrEqual(2);

        const cronIds = response.data.map((c) => c.id);
        expect(cronIds).toContain(cron1.id);
        expect(cronIds).toContain(cron2.id);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should paginate crons correctly",
      async () => {
        // Create 5 crons
        for (let i = 0; i < 5; i++) {
          const cron = await createTestCron(client);
          createdCrons.push(cron);
        }

        const response1 = await client.crons.list({ page: 0, limit: 2 });
        expect(response1.data.length).toBe(2);
        expect(response1.pagination.page).toBe(0);
        expect(response1.pagination.limit).toBe(2);
        expect(response1.pagination.total).toBeGreaterThanOrEqual(5);

        const response2 = await client.crons.list({ page: 1, limit: 2 });
        expect(response2.data.length).toBe(2);
        expect(response2.pagination.page).toBe(1);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should filter by is_active",
      async () => {
        const activeCron1 = await createTestCron(client, { is_active: true });
        const activeCron2 = await createTestCron(client, { is_active: true });
        const inactiveCron = await createTestCron(client, { is_active: false });
        createdCrons.push(activeCron1, activeCron2, inactiveCron);

        const response = await client.crons.list({ is_active: true });
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data.every((c) => c.is_active === true)).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should filter by is_active false",
      async () => {
        const inactiveCron1 = await createTestCron(client, {
          is_active: false,
        });
        const inactiveCron2 = await createTestCron(client, {
          is_active: false,
        });
        createdCrons.push(inactiveCron1, inactiveCron2);

        const response = await client.crons.list({ is_active: false });
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data.every((c) => c.is_active === false)).toBe(true);
      },
    );
  });

  describe("Get Cron", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should retrieve cron by id",
      async () => {
        const cron = await createTestCron(client);
        createdCrons.push(cron);

        const retrieved = await client.crons.get(cron.id);
        expect(retrieved.id).toBe(cron.id);
        expect(retrieved.webhook_url).toBe(cron.webhook_url);
        expect(retrieved.method).toBe(cron.method);
        expect(retrieved.cron_expression).toBe(cron.cron_expression);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent cron",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.crons.get(fakeId)).rejects.toThrow();
      },
    );
  });

  describe("Create Cron", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should create cron successfully",
      async () => {
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
        });
        createdCrons.push(cron);

        expect(cron).toHaveProperty("id");
        expect(cron.webhook_url).toBe("https://example.com/webhook");
        expect(cron.method).toBe("POST");
        expect(cron.cron_expression).toBe("0 0 * * *");
        expect(cron.is_active).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create cron with all optional fields",
      async () => {
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 12 * * *",
          timezone: "America/New_York",
          is_active: false,
          headers: {
            "X-Custom-Header": "value",
          },
          payload: { key: "value" },
          retry_config: {
            maxRetries: 5,
            backoffMs: 1000,
            backoffType: "exponential",
          },
        });
        createdCrons.push(cron);

        expect(cron.timezone).toBe("America/New_York");
        expect(cron.is_active).toBe(false);
        expect(cron.headers).toEqual({ "X-Custom-Header": "value" });
        expect(cron.payload).toEqual({ key: "value" });
        expect(cron.retry_config).toEqual({
          maxRetries: 5,
          backoffMs: 1000,
          backoffType: "exponential",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create cron with relative webhook URL when baseUrl is set",
      async () => {
        const clientWithBaseUrl = new Cuey({
          apiKey: process.env.TEST_API_KEY!,
          baseUrl: "https://example.com",
        });

        const cron = await clientWithBaseUrl.crons.create({
          webhook_url: "/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
        });
        createdCrons.push(cron);

        expect(cron.webhook_url).toBe("https://example.com/webhook");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid cron expression",
      async () => {
        await expect(
          client.crons.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            cron_expression: "invalid cron",
          }),
        ).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid webhook URL",
      async () => {
        await expect(
          client.crons.create({
            webhook_url: "not-a-url",
            method: "POST",
            cron_expression: "0 0 * * *",
          }),
        ).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should default method to POST when not specified",
      async () => {
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          cron_expression: "0 0 * * *",
        });
        createdCrons.push(cron);

        expect(cron.method).toBe("POST");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should default is_active to true when not specified",
      async () => {
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
        });
        createdCrons.push(cron);

        expect(cron.is_active).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should accept valid cron expressions",
      async () => {
        const cronExpressions = [
          "0 0 * * *", // Daily at midnight
          "0 * * * *", // Every hour
          "*/5 * * * *", // Every 5 minutes
          "0 9 * * 1-5", // Weekdays at 9 AM
        ];

        for (const expr of cronExpressions) {
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
  });

  describe("Update Cron", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should update cron successfully",
      async () => {
        const cron = await createTestCron(client);
        createdCrons.push(cron);

        const updated = await client.crons.update(cron.id, {
          webhook_url: "https://updated.example.com/webhook",
          method: "PUT",
          cron_expression: "0 12 * * *",
          is_active: false,
        });

        expect(updated.webhook_url).toBe("https://updated.example.com/webhook");
        expect(updated.method).toBe("PUT");
        expect(updated.cron_expression).toBe("0 12 * * *");
        expect(updated.is_active).toBe(false);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should update cron with all fields",
      async () => {
        const cron = await createTestCron(client);
        createdCrons.push(cron);

        const updated = await client.crons.update(cron.id, {
          webhook_url: "https://updated.example.com/webhook",
          method: "PATCH",
          cron_expression: "0 18 * * *",
          timezone: "America/Los_Angeles",
          is_active: true,
          headers: {
            "X-Updated": "header",
          },
          payload: { updated: true },
          retry_config: {
            maxRetries: 3,
            backoffMs: 500,
            backoffType: "linear",
          },
        });

        expect(updated.timezone).toBe("America/Los_Angeles");
        expect(updated.headers).toEqual({ "X-Updated": "header" });
        expect(updated.payload).toEqual({ updated: true });
        expect(updated.retry_config).toEqual({
          maxRetries: 3,
          backoffMs: 500,
          backoffType: "linear",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent cron",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(
          client.crons.update(fakeId, {
            webhook_url: "https://example.com/webhook",
            method: "POST",
            cron_expression: "0 0 * * *",
          }),
        ).rejects.toThrow();
      },
    );
  });

  describe("Delete Cron", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should delete cron successfully",
      async () => {
        const cron = await createTestCron(client);
        console.log("[DELETE TEST] Created cron:", {
          id: cron.id,
          is_active: cron.is_active,
          cron_expression: cron.cron_expression,
        });

        try {
          const deleteResult = await client.crons.delete(cron.id);
          console.log("[DELETE TEST] Delete result:", deleteResult);
          // Delete should succeed without throwing
        } catch (error) {
          console.error("[DELETE TEST] Delete threw error:", {
            error,
            errorType: error?.constructor?.name,
            errorMessage: error?.message,
            errorStack: error?.stack,
          });
          throw error;
        }

        // Verify it's deleted
        await expect(client.crons.get(cron.id)).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent cron",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.crons.delete(fakeId)).rejects.toThrow();
      },
    );
  });
});
