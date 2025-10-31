/**
 * Test helper utilities
 *
 * Helper functions for creating test data and cleanup
 */

import { Cuey } from "../src/client";
import type { CreateCronInput, CreateEventInput } from "../src/types/api";
import type { Cron, Event } from "../src/types/models";
import { getFutureDate } from "./setup";

/**
 * Helper to create a test event
 * Creates an event and returns it, optionally cleans up after test
 */
export async function createTestEvent(
  client: Cuey,
  input?: Partial<CreateEventInput>,
): Promise<Event> {
  const futureDate = getFutureDate(1);

  const eventInput: CreateEventInput = {
    webhook_url: "https://example.com/webhook",
    method: "POST",
    scheduled_at: futureDate,
    ...input,
  };

  return await client.events.create(eventInput);
}

/**
 * Helper to create a test cron job
 */
export async function createTestCron(
  client: Cuey,
  input?: Partial<CreateCronInput>,
): Promise<Cron> {
  const cronInput: CreateCronInput = {
    webhook_url: "https://example.com/webhook",
    method: "POST",
    cron_expression: "0 0 * * *", // Daily at midnight
    is_active: true,
    ...input,
  };

  return await client.crons.create(cronInput);
}

/**
 * Helper to clean up test resources
 */
export async function cleanupResources(
  client: Cuey,
  events: Event[],
  crons: Cron[],
): Promise<void> {
  // Delete events in parallel
  await Promise.allSettled(
    events.map((event) => {
      if (event.status === "pending" && !event.cron_id) {
        return client.events.delete(event.id).catch(() => {
          // Ignore errors (event might already be deleted or not deletable)
        });
      }
      return Promise.resolve();
    }),
  );

  // Delete crons in parallel
  await Promise.allSettled(
    crons.map((cron) =>
      client.crons.delete(cron.id).catch(() => {
        // Ignore errors
      }),
    ),
  );
}

/**
 * Clean up all pending events (events that are pending and not from a cron)
 */
export async function cleanupAllPendingEvents(client: Cuey): Promise<void> {
  try {
    // Fetch all pending events
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.events.list({
        status: "pending",
        page,
        limit: 100,
      });

      // Delete all pending events that don't have a cron_id (manually created)
      const deletableEvents = response.data.filter(
        (event) => event.status === "pending" && !event.cron_id,
      );

      await Promise.allSettled(
        deletableEvents.map((event) =>
          client.events.delete(event.id).catch(() => {
            // Ignore errors
          }),
        ),
      );

      // Check if there are more pages
      const totalItems = response.pagination.total;
      const itemsProcessed = (page + 1) * response.pagination.limit;
      hasMore = itemsProcessed < totalItems;
      page++;
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Clean up all crons
 */
export async function cleanupAllCrons(client: Cuey): Promise<void> {
  try {
    // Fetch all crons
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.crons.list({
        page,
        limit: 100,
      });

      // Delete all crons
      await Promise.allSettled(
        response.data.map((cron) =>
          client.crons.delete(cron.id).catch(() => {
            // Ignore errors
          }),
        ),
      );

      // Check if there are more pages
      const totalItems = response.pagination.total;
      const itemsProcessed = (page + 1) * response.pagination.limit;
      hasMore = itemsProcessed < totalItems;
      page++;
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}
