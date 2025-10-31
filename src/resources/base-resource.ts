import { ValidationError } from "../types/errors";
import {
  ALLOWED_HTTP_METHODS,
  type HttpMethod,
  type RetryConfig,
} from "../types/models";
import type { HttpClient } from "../utils/http";

/**
 * Base resource class with validation utilities
 */
export abstract class BaseResource {
  constructor(
    protected readonly http: HttpClient,
    protected readonly webhookBaseUrl: string | undefined,
  ) {}

  /**
   * Validates and normalizes a webhook URL
   *
   * @param webhookUrl - The webhook URL to validate and normalize
   * @returns The normalized, fully qualified webhook URL
   * @throws {ValidationError} When the URL is invalid or cannot be resolved
   */
  protected validateAndNormalizeWebhookUrl(webhookUrl: string): string {
    if (!webhookUrl || typeof webhookUrl !== "string") {
      throw new ValidationError(
        "webhook_url is required and must be a string",
        { field: "webhook_url", value: webhookUrl },
      );
    }

    const trimmed = webhookUrl.trim();

    // If it's already a full URL, validate it
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        throw new ValidationError(
          `Invalid webhook URL: "${trimmed}" is not a valid URL`,
          { field: "webhook_url", value: trimmed },
        );
      }
    }

    // If it's a relative path, we need a base URL
    if (trimmed.startsWith("/")) {
      if (!this.webhookBaseUrl) {
        throw new ValidationError(
          "Relative webhook URL provided but no baseUrl is configured. " +
            "Either provide a full URL (starting with http:// or https://) " +
            "or configure baseUrl in CueyConfig or set CUEY_BASE_URL environment variable.",
          {
            field: "webhook_url",
            value: trimmed,
            baseUrl: this.webhookBaseUrl,
          },
        );
      }

      try {
        const baseUrl = this.webhookBaseUrl.replace(/\/$/, "");
        const fullUrl = `${baseUrl}${trimmed}`;
        new URL(fullUrl); // Validate the combined URL
        return fullUrl;
      } catch {
        throw new ValidationError(
          `Invalid webhook URL: Cannot combine baseUrl "${this.webhookBaseUrl}" with path "${trimmed}"`,
          {
            field: "webhook_url",
            value: trimmed,
            baseUrl: this.webhookBaseUrl,
          },
        );
      }
    }

    // If it doesn't start with / or http(s)://, it's invalid
    throw new ValidationError(
      `Invalid webhook URL: "${trimmed}" must be a full URL (starting with http:// or https://) or a relative path (starting with /)`,
      { field: "webhook_url", value: trimmed },
    );
  }

  /**
   * Validates retry configuration
   *
   * @param retryConfig - The retry configuration to validate
   * @throws {ValidationError} When the retry configuration is invalid
   */
  protected validateRetryConfig(
    retryConfig: RetryConfig | null | undefined,
  ): void {
    if (retryConfig === null || retryConfig === undefined) {
      return; // null/undefined is valid (uses defaults)
    }

    if (typeof retryConfig !== "object") {
      throw new ValidationError("retry_config must be an object or null", {
        field: "retry_config",
        value: retryConfig,
      });
    }

    if (
      retryConfig.maxRetries !== undefined &&
      (typeof retryConfig.maxRetries !== "number" ||
        retryConfig.maxRetries < 1 ||
        retryConfig.maxRetries > 10 ||
        !Number.isInteger(retryConfig.maxRetries))
    ) {
      throw new ValidationError(
        "retry_config.maxRetries must be an integer between 1 and 10",
        {
          field: "retry_config.maxRetries",
          value: retryConfig.maxRetries,
        },
      );
    }

    if (
      retryConfig.backoffMs !== undefined &&
      (typeof retryConfig.backoffMs !== "number" ||
        retryConfig.backoffMs < 100 ||
        retryConfig.backoffMs > 5000 ||
        !Number.isInteger(retryConfig.backoffMs))
    ) {
      throw new ValidationError(
        "retry_config.backoffMs must be an integer between 100 and 5000",
        {
          field: "retry_config.backoffMs",
          value: retryConfig.backoffMs,
        },
      );
    }

    if (
      retryConfig.backoffType !== undefined &&
      retryConfig.backoffType !== "exponential" &&
      retryConfig.backoffType !== "linear"
    ) {
      throw new ValidationError(
        'retry_config.backoffType must be either "exponential" or "linear"',
        {
          field: "retry_config.backoffType",
          value: retryConfig.backoffType,
        },
      );
    }
  }

  /**
   * Validates HTTP headers
   *
   * @param headers - The headers to validate
   * @throws {ValidationError} When headers are invalid
   */
  protected validateHeaders(
    headers: Record<string, string> | null | undefined,
  ): void {
    if (headers === null || headers === undefined) {
      return; // null/undefined is valid
    }

    if (typeof headers !== "object" || Array.isArray(headers)) {
      throw new ValidationError("headers must be an object or null", {
        field: "headers",
        value: headers,
      });
    }

    for (const [key, value] of Object.entries(headers)) {
      if (typeof key !== "string" || key.trim() === "") {
        throw new ValidationError("All header keys must be non-empty strings", {
          field: "headers",
          key,
          value,
        });
      }
      if (typeof value !== "string") {
        throw new ValidationError(`Header "${key}" must have a string value`, {
          field: "headers",
          key,
          value,
        });
      }
    }
  }

  /**
   * Validates an HTTP method
   *
   * @param method - The HTTP method to validate (optional)
   * @returns The validated HTTP method, or undefined if not provided
   * @throws {ValidationError} When the method is invalid
   */
  protected validateMethod(method?: HttpMethod): HttpMethod | undefined {
    // If not provided, return undefined (for updates where undefined means "don't change")
    if (method === undefined) {
      return undefined;
    }

    // Validate it's one of the allowed methods
    if (!ALLOWED_HTTP_METHODS.includes(method)) {
      throw new ValidationError(
        `Invalid HTTP method: "${method}". Must be one of: ${ALLOWED_HTTP_METHODS.join(
          ", ",
        )}`,
        {
          field: "method",
          value: method,
          allowedMethods: ALLOWED_HTTP_METHODS,
        },
      );
    }

    return method;
  }

  /**
   * Validates a scheduled_at timestamp
   *
   * @param scheduledAt - ISO timestamp string to validate
   * @throws {ValidationError} When the timestamp is invalid or in the past
   */
  protected validateScheduledAt(scheduledAt: string): void {
    if (!scheduledAt || typeof scheduledAt !== "string") {
      throw new ValidationError(
        "scheduled_at is required and must be a string",
        { field: "scheduled_at", value: scheduledAt },
      );
    }

    const trimmed = scheduledAt.trim();
    if (trimmed === "") {
      throw new ValidationError("scheduled_at cannot be empty", {
        field: "scheduled_at",
        value: scheduledAt,
      });
    }

    // Try to parse as ISO date
    let date: Date;
    try {
      date = new Date(trimmed);
    } catch {
      throw new ValidationError(
        `Invalid scheduled_at format: "${trimmed}" is not a valid ISO timestamp`,
        { field: "scheduled_at", value: trimmed },
      );
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new ValidationError(
        `Invalid scheduled_at: "${trimmed}" is not a valid date`,
        { field: "scheduled_at", value: trimmed },
      );
    }

    // Check if date is in the future
    const now = new Date();
    if (date <= now) {
      throw new ValidationError(
        `scheduled_at must be in the future. Received: "${trimmed}"`,
        { field: "scheduled_at", value: trimmed, now: now.toISOString() },
      );
    }
  }
}
