/**
 * Tests for Events resource
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
import type { Event } from "../src/types/models";
import {
  cleanupAllCrons,
  cleanupAllPendingEvents,
  cleanupResources,
  createTestEvent,
} from "./helpers";
import {
  expectISOStringEqual,
  getFutureDate,
  getTestClient,
  isTestApiKeyAvailable,
} from "./setup";

describe("Events Resource", () => {
  let client: Cuey;
  const createdEvents: Event[] = [];
  const createdCrons: any[] = [];

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

  describe("List Events", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should return events for authenticated team",
      async () => {
        const event1 = await createTestEvent(client);
        const event2 = await createTestEvent(client);
        createdEvents.push(event1, event2);

        const response = await client.events.list();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.pagination.total).toBeGreaterThanOrEqual(2);

        const eventIds = response.data.map((e) => e.id);
        expect(eventIds).toContain(event1.id);
        expect(eventIds).toContain(event2.id);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should paginate events correctly",
      async () => {
        // Create 5 events
        for (let i = 0; i < 5; i++) {
          const event = await createTestEvent(client);
          createdEvents.push(event);
        }

        const response1 = await client.events.list({ page: 0, limit: 2 });
        expect(response1.data.length).toBe(2);
        expect(response1.pagination.page).toBe(0);
        expect(response1.pagination.limit).toBe(2);
        expect(response1.pagination.total).toBeGreaterThanOrEqual(5);

        const response2 = await client.events.list({ page: 1, limit: 2 });
        expect(response2.data.length).toBe(2);
        expect(response2.pagination.page).toBe(1);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should paginate events correctly with proper ordering by scheduled_at descending",
      async () => {
        // Create 6 events with different scheduled_at times to ensure proper ordering
        // scheduled_at is in descending order (most recent first)
        const events: Event[] = [];
        for (let i = 0; i < 6; i++) {
          const futureDate = getFutureDate(i + 1); // Different hours for each event
          const event = await client.events.create({
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
          });
          events.push(event);
          createdEvents.push(event);
        }

        // Events are ordered by scheduled_at descending (most recent first)
        // So events[5] (hour 6) should be first, events[4] (hour 5) second, etc.
        // Page 0, limit 2: should return events[5], events[4]
        // Page 1, limit 2: should return events[3], events[2]

        const response = await client.events.list({ page: 1, limit: 2 });
        expect(response.data.length).toBe(2);
        expect(response.pagination.page).toBe(1);
        expect(response.pagination.limit).toBe(2);
        expect(response.pagination.total).toBeGreaterThanOrEqual(6);

        // Get all events to verify ordering
        const allEvents = await client.events.list({ limit: 100 });
        // Find indices of our created events in the response (sorted by scheduled_at descending)
        const eventIdsInResponse = allEvents.data
          .filter((e) => events.some((created) => created.id === e.id))
          .map((e) => e.id);

        // Page 1 should contain events[3] and events[2] (indices 3 and 2)
        // Since events are ordered by scheduled_at descending:
        // - events[5] is latest (hour 6) - should be first
        // - events[4] is second (hour 5)
        // - events[3] is third (hour 4) - should be at page 1, position 0
        // - events[2] is fourth (hour 3) - should be at page 1, position 1
        const expectedIds = [
          events[3].id, // 4th in descending order (hour 4)
          events[2].id, // 5th in descending order (hour 3)
        ];

        // Check that page 1 contains the expected event IDs
        const page1Ids = response.data.map((e) => e.id);
        expect(page1Ids).toContain(expectedIds[0]);
        expect(page1Ids).toContain(expectedIds[1]);
        expect(page1Ids.length).toBe(2);

        // Verify the ordering is correct (scheduled_at descending)
        const event3 = response.data.find((e) => e.id === events[3].id);
        const event2 = response.data.find((e) => e.id === events[2].id);
        expect(event3).toBeDefined();
        expect(event2).toBeDefined();

        // Verify scheduled_at is in descending order within the page
        const scheduledAts = response.data.map((e) =>
          new Date(e.scheduled_at).getTime(),
        );
        expect(scheduledAts[0]).toBeGreaterThanOrEqual(scheduledAts[1]);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should filter by status",
      async () => {
        // Create events that will be pending
        const event1 = await createTestEvent(client);
        const event2 = await createTestEvent(client);
        createdEvents.push(event1, event2);

        const response = await client.events.list({ status: "pending" });
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data.every((e) => e.status === "pending")).toBe(true);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should filter by cron_id",
      async () => {
        // Create a cron and events with/without cron_id
        const cron = await client.crons.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          cron_expression: "0 0 * * *",
          is_active: true,
        });
        createdCrons.push(cron);

        // Note: We can't directly create events with cron_id via the API
        // This test verifies the filtering works if such events exist
        const response = await client.events.list({ cron_id: cron.id });
        expect(Array.isArray(response.data)).toBe(true);
      },
    );
  });

  describe("Get Event", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should retrieve event by id",
      async () => {
        const event = await createTestEvent(client);
        createdEvents.push(event);

        const retrieved = await client.events.get(event.id);
        expect(retrieved.id).toBe(event.id);
        expect(retrieved.webhook_url).toBe(event.webhook_url);
        expect(retrieved.method).toBe(event.method);
        expect(retrieved.status).toBe("pending");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent event",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.events.get(fakeId)).rejects.toThrow();
      },
    );
  });

  describe("Create Event", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should create event successfully",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event).toHaveProperty("id");
        expect(event.webhook_url).toBe("https://example.com/webhook");
        expect(event.method).toBe("POST");
        expect(event.status).toBe("pending");
        expectISOStringEqual(event.scheduled_at, futureDate);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create event with all optional fields",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
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
        createdEvents.push(event);

        expect(event.headers).toEqual({ "X-Custom-Header": "value" });
        expect(event.payload).toEqual({ key: "value" });
        expect(event.retry_config).toEqual({
          maxRetries: 5,
          backoffMs: 1000,
          backoffType: "exponential",
        });
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should create event with relative webhook URL when baseUrl is set",
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
        createdEvents.push(event);

        expect(event.webhook_url).toBe("https://example.com/webhook");
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
        ).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should reject invalid webhook URL",
      async () => {
        const futureDate = getFutureDate(1);
        await expect(
          client.events.create({
            webhook_url: "not-a-url",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow();
      },
    );

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
        ).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should default method to POST when not specified",
      async () => {
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          scheduled_at: futureDate,
        });
        createdEvents.push(event);

        expect(event.method).toBe("POST");
      },
    );
  });

  describe("Update Event", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should update pending event successfully",
      async () => {
        const event = await createTestEvent(client);
        createdEvents.push(event);

        const newScheduledAt = getFutureDate(2);
        const updated = await client.events.update(event.id, {
          webhook_url: "https://updated.example.com/webhook",
          method: "PUT",
          scheduled_at: newScheduledAt,
        });

        expect(updated.webhook_url).toBe("https://updated.example.com/webhook");
        expect(updated.method).toBe("PUT");
        expectISOStringEqual(updated.scheduled_at, newScheduledAt);
        expect(updated.status).toBe("pending");
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should update event with all fields",
      async () => {
        const event = await createTestEvent(client);
        createdEvents.push(event);

        const newScheduledAt = getFutureDate(2);
        const updated = await client.events.update(event.id, {
          webhook_url: "https://updated.example.com/webhook",
          method: "PATCH",
          scheduled_at: newScheduledAt,
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
      "should throw NotFoundError for non-existent event",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        const futureDate = getFutureDate(2);

        await expect(
          client.events.update(fakeId, {
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: futureDate,
          }),
        ).rejects.toThrow();
      },
    );
  });

  describe("Delete Event", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should delete pending event successfully",
      async () => {
        const event = await createTestEvent(client);
        // console.log("[DELETE TEST] Created event:", {
        //   id: event.id,
        //   status: event.status,
        //   scheduled_at: event.scheduled_at,
        // });

        try {
          const deleteResult = await client.events.delete(event.id);
          expect(deleteResult).toBeUndefined();
          // console.log("[DELETE TEST] Delete result:", deleteResult);
          // Delete should succeed without throwing
        } catch (error) {
          // console.error("[DELETE TEST] Delete threw error:", {
          //   error,
          //   errorType: error?.constructor?.name,
          //   errorMessage: error?.message,
          //   errorStack: error?.stack,
          // });
          throw error;
        }

        // Verify it's deleted
        await expect(client.events.get(event.id)).rejects.toThrow();
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent event",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.events.delete(fakeId)).rejects.toThrow();
      },
    );
  });
});
