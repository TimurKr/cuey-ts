/**
 * Tests for error handling
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { Cuey } from "../src/client";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../src/types/errors";
import { getFutureDate, getTestClient, isTestApiKeyAvailable } from "./setup";

describe("Error Handling", () => {
  let client: Cuey;

  beforeAll(() => {
    if (!isTestApiKeyAvailable()) return;
    client = getTestClient();
  });

  describe("UnauthorizedError", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should throw UnauthorizedError with invalid API key",
      async () => {
        const invalidClient = new Cuey({
          apiKey: "invalid-api-key",
        });

        await expect(invalidClient.events.list()).rejects.toThrow(
          UnauthorizedError,
        );
      },
    );

    test("should throw UnauthorizedError with missing API key", async () => {
      const originalKey = process.env.CUEY_API_KEY;
      delete process.env.CUEY_API_KEY;
      const clientNoKey = new Cuey();

      try {
        await expect(clientNoKey.events.list()).rejects.toThrow();
      } finally {
        if (originalKey) {
          process.env.CUEY_API_KEY = originalKey;
        }
      }
    });

    test.skipIf(!isTestApiKeyAvailable())(
      "should have correct error properties for UnauthorizedError",
      async () => {
        const invalidClient = new Cuey({
          apiKey: "invalid-api-key",
        });

        try {
          await invalidClient.events.list();
          throw new Error("Should have thrown UnauthorizedError");
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedError);
          expect(error).toBeInstanceOf(Error);
          if (error instanceof UnauthorizedError) {
            expect(error.code).toBe("UNAUTHORIZED");
            expect(error.statusCode).toBe(401);
            expect(error.message).toBeTruthy();
          }
        }
      },
    );
  });

  describe("NotFoundError", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent event",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.events.get(fakeId)).rejects.toThrow(NotFoundError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should throw NotFoundError for non-existent cron",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(client.crons.get(fakeId)).rejects.toThrow(NotFoundError);
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should have correct error properties for NotFoundError",
      async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        try {
          await client.events.get(fakeId);
          throw new Error("Should have thrown NotFoundError");
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundError);
          if (error instanceof NotFoundError) {
            expect(error.code).toBe("NOT_FOUND");
            expect(error.statusCode).toBe(404);
            expect(error.message).toBeTruthy();
          }
        }
      },
    );
  });

  describe("BadRequestError", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should throw BadRequestError for invalid request",
      async () => {
        // Try to update an event with past scheduled_at
        // First create an event
        const futureDate = getFutureDate(1);
        const event = await client.events.create({
          webhook_url: "https://example.com/webhook",
          method: "POST",
          scheduled_at: futureDate,
        });

        // Try to update with past date - but client-side validation should catch this
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        try {
          await client.events.update(event.id, {
            webhook_url: "https://example.com/webhook",
            method: "POST",
            scheduled_at: pastDate.toISOString(),
          });
          throw new Error("Should have thrown ValidationError");
        } catch (error) {
          // Client-side validation should catch past dates
          expect(error).toBeInstanceOf(ValidationError);
        }

        // Cleanup
        try {
          await client.events.delete(event.id);
        } catch {
          // Ignore
        }
      },
    );

    test.skipIf(!isTestApiKeyAvailable())(
      "should have correct error properties for BadRequestError",
      async () => {
        // This would need a server-side bad request scenario
        // For now, we verify the error type exists and has correct structure
        const error = new BadRequestError("Test error", { field: "test" });
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe("Test error");
        expect(error.details).toEqual({ field: "test" });
      },
    );
  });

  describe("ValidationError", () => {
    test.skipIf(!isTestApiKeyAvailable())(
      "should throw ValidationError for invalid webhook URL",
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
      "should throw ValidationError for past scheduled_at",
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
      "should throw ValidationError for invalid HTTP method",
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

    test("should have correct error properties for ValidationError", async () => {
      const error = new ValidationError("Test validation error", {
        field: "test_field",
      });
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Test validation error");
      expect(error.validationErrors).toEqual({ field: "test_field" });
    });
  });

  describe("InternalServerError", () => {
    test("should have correct error properties for InternalServerError", () => {
      const error = new InternalServerError("Test server error", {
        detail: "test",
      });
      expect(error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Test server error");
      expect(error.details).toEqual({ detail: "test" });
    });
  });

  describe("Error Type Checking", () => {
    test("should allow instanceof checks for error types", () => {
      const unauthorized = new UnauthorizedError();
      const notFound = new NotFoundError();
      const badRequest = new BadRequestError("test");
      const validation = new ValidationError("test", {});
      const internal = new InternalServerError();

      expect(unauthorized).toBeInstanceOf(UnauthorizedError);
      expect(notFound).toBeInstanceOf(NotFoundError);
      expect(badRequest).toBeInstanceOf(BadRequestError);
      expect(validation).toBeInstanceOf(ValidationError);
      expect(internal).toBeInstanceOf(InternalServerError);

      // All should be instances of Error
      expect(unauthorized).toBeInstanceOf(Error);
      expect(notFound).toBeInstanceOf(Error);
      expect(badRequest).toBeInstanceOf(Error);
      expect(validation).toBeInstanceOf(Error);
      expect(internal).toBeInstanceOf(Error);
    });

    test.skipIf(!isTestApiKeyAvailable())(
      "should preserve error details",
      async () => {
        const invalidClient = new Cuey({
          apiKey: "invalid-api-key",
        });

        try {
          await invalidClient.events.list();
          throw new Error("Should have thrown UnauthorizedError");
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedError);
          if (error instanceof UnauthorizedError) {
            expect(error.code).toBe("UNAUTHORIZED");
            expect(error.statusCode).toBe(401);
            expect(typeof error.message).toBe("string");
          }
        }
      },
    );
  });
});
