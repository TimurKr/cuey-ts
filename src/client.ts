import { CronsResource } from "./resources/crons";
import { EventsResource } from "./resources/events";
import type { CreateCronInput, CreateEventInput } from "./types/api";
import type { Cron, Event } from "./types/models";
import { HttpClient, type HttpClientConfig } from "./utils/http";

/**
 * Configuration options for the Cuey client
 */
export interface CueyConfig {
  /**
   * Base URL for webhook URLs. If provided, relative webhook URLs will be resolved against this base URL.
   * If not provided, the CUEY_BASE_URL environment variable will be checked.
   * If neither is provided, webhook URLs must be fully qualified.
   */
  baseUrl?: string;
  /**
   * API key for authentication. If not provided, the CUEY_API_KEY environment variable will be checked.
   * If neither is provided, an error will be thrown when making API calls.
   */
  apiKey?: string;
}

/**
 * Main client class for interacting with the Cuey API
 */
export class Cuey {
  /**
   * Resource for managing cron jobs
   */
  public readonly crons: CronsResource;

  /**
   * Resource for managing events
   */
  public readonly events: EventsResource;

  private readonly http: HttpClient;

  /**
   * Base URL for webhook URLs. If set, relative webhook URLs will be resolved against this.
   * Falls back to CUEY_BASE_URL environment variable if not provided.
   */
  public readonly webhookBaseUrl: string | undefined;

  /**
   * Creates a new Cuey instance
   *
   * @param config - Configuration object with optional baseUrl and apiKey
   *
   * @example
   * ```typescript
   * // With explicit configuration
   * const client = new Cuey({
   *   baseUrl: 'https://example.com',
   *   apiKey: 'your-api-key'
   * });
   *
   * // Using environment variables
   * const client = new Cuey({
   *   apiKey: 'your-api-key'
   * });
   *
   * // Using only environment variables (or default instance)
   * import { cuey } from 'cuey';
   * await cuey.schedule({ ... });
   * ```
   */
  constructor(config: CueyConfig = {}) {
    // Resolve webhook base URL from config or environment variable
    this.webhookBaseUrl =
      config.baseUrl ||
      (typeof process !== "undefined" &&
        typeof process.env !== "undefined" &&
        process.env.CUEY_BASE_URL) ||
      undefined;

    // Create a function that resolves the API key lazily
    // This allows the instance to be created without throwing errors
    const getApiKey = (): string => {
      const apiKey =
        config.apiKey ||
        (typeof process !== "undefined" &&
          typeof process.env !== "undefined" &&
          process.env.CUEY_API_KEY) ||
        undefined;

      if (!apiKey) {
        throw new Error(
          "API key is required. Provide it via config.apiKey or set the CUEY_API_KEY environment variable.",
        );
      }

      return apiKey;
    };

    const httpConfig: HttpClientConfig = {
      getApiKey,
    };

    this.http = new HttpClient(httpConfig);
    this.crons = new CronsResource(this.http, this.webhookBaseUrl);
    this.events = new EventsResource(this.http, this.webhookBaseUrl);
  }

  /**
   * Schedule an event for future execution
   *
   * Alias for `client.events.create()`
   *
   * @param input - Event creation parameters
   * @param input.webhook_url - The URL to send the webhook to. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured.
   * @param input.method - HTTP method to use (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Defaults to 'POST' if not specified
   * @param input.scheduled_at - ISO timestamp when the event should be executed (must be in the future)
   * @param input.headers - Optional HTTP headers to include in the webhook request
   * @param input.payload - Optional JSON payload to send with the webhook
   * @param input.retry_config - Optional retry configuration for failed webhooks
   * @returns Promise resolving to the created event object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {ValidationError} When input validation fails
   * @throws {BadRequestError} When the request is invalid (e.g., scheduled_at is in the past)
   * @throws {InternalServerError} When a server error occurs
   */
  async schedule(input: CreateEventInput): Promise<Event> {
    return this.events.create(input);
  }

  /**
   * Create a cron job that will repeat according to the cron expression
   *
   * Alias for `client.crons.create()`
   *
   * @param input - Cron job creation parameters
   * @param input.webhook_url - The URL to send the webhook to. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured
   * @param input.method - HTTP method to use (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Defaults to 'POST' if not specified
   * @param input.cron_expression - Cron expression defining the schedule (e.g., '0 0 * * *' for daily at midnight)
   * @param input.timezone - Optional timezone for the cron expression (e.g., 'America/New_York')
   * @param input.headers - Optional HTTP headers to include in the webhook request
   * @param input.payload - Optional JSON payload to send with the webhook
   * @param input.retry_config - Optional retry configuration for failed webhooks
   * @param input.is_active - Whether the cron job is active (defaults to true)
   * @returns Promise resolving to the created cron job object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {ValidationError} When input validation fails (e.g., invalid cron expression, invalid webhook URL)
   * @throws {BadRequestError} When the request is invalid
   * @throws {InternalServerError} When a server error occurs
   */
  async repeat(input: CreateCronInput): Promise<Cron> {
    return this.crons.create(input);
  }
}

/**
 * Default Cuey instance that uses environment variables for configuration.
 *
 * This instance is created without throwing errors. The API key and base URL
 * are resolved from environment variables (CUEY_API_KEY and CUEY_BASE_URL)
 * when methods are called.
 *
 * @example
 * ```typescript
 * import { cuey } from 'cuey';
 *
 * // Uses CUEY_API_KEY and CUEY_BASE_URL from environment
 * await cuey.schedule({
 *   webhook_url: '/webhook',
 *   scheduled_at: '2024-12-31T00:00:00Z'
 *   // method defaults to 'POST' if not specified
 * });
 * ```
 */
export const cuey = new Cuey();
