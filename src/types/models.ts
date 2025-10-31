/**
 * Array of all allowed HTTP methods
 */
export const ALLOWED_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

/**
 * HTTP method enum matching the API
 *
 * Supported HTTP methods for webhook requests:
 * - GET: Retrieve data
 * - POST: Create or send data
 * - PUT: Update or replace data
 * - PATCH: Partially update data
 * - DELETE: Delete data
 * - HEAD: Retrieve headers only
 * - OPTIONS: Get allowed methods
 */
export type HttpMethod = (typeof ALLOWED_HTTP_METHODS)[number];

/**
 * Event status enum matching the API
 *
 * Status values for event execution:
 * - pending: Event is scheduled but not yet executed
 * - processing: Event is currently being executed
 * - success: Event executed successfully
 * - failed: Event execution failed (after all retries)
 */
export type EventStatus = "pending" | "processing" | "success" | "failed";

/**
 * JSON type for API payloads
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Retry configuration for webhooks
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (1-10)
   */
  maxRetries: number;
  /**
   * Backoff delay in milliseconds between retries (100-5000)
   */
  backoffMs: number;
  /**
   * Type of backoff strategy: 'exponential' multiplies delay by 2^retryCount, 'linear' uses constant delay
   */
  backoffType: "exponential" | "linear";
}

/**
 * Cron job model
 */
export interface Cron {
  /**
   * Unique identifier for the cron job (UUID)
   */
  id: string;
  /**
   * Cron expression defining when the webhook should be executed (e.g., '0 0 * * *' for daily at midnight)
   */
  cron_expression: string;
  /**
   * Timezone for the cron expression (e.g., 'America/New_York'). Null if using UTC
   */
  timezone: string | null;
  /**
   * The URL where the webhook will be sent
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook
   */
  method: HttpMethod;
  /**
   * HTTP headers to include in the webhook request. Null if no custom headers
   */
  headers: Json | null;
  /**
   * JSON payload to send with the webhook. Null if no payload
   */
  payload: Json | null;
  /**
   * Retry configuration for failed webhook attempts. Null if using default retry settings
   */
  retry_config: RetryConfig | null;
  /**
   * Whether the cron job is currently active and will execute. Null defaults to true
   */
  is_active: boolean | null;
  /**
   * ISO timestamp when the cron job was created
   */
  created_at: string | null;
  /**
   * ISO timestamp when the cron job was last updated
   */
  updated_at: string | null;
  /**
   * ID of the team that owns this cron job
   */
  team_id: string | null;
}

/**
 * Event model
 */
export interface Event {
  /**
   * Unique identifier for the event (UUID)
   */
  id: string;
  /**
   * ID of the cron job that created this event. Null if created manually
   */
  cron_id: string | null;
  /**
   * ID of the original event if this is a retry attempt. Null if this is not a retry
   */
  retry_of: string | null;
  /**
   * ISO timestamp when the event is scheduled to be executed
   */
  scheduled_at: string;
  /**
   * ISO timestamp when the event was actually executed. Null if not yet executed
   */
  executed_at: string | null;
  /**
   * Current status of the event
   */
  status: EventStatus;
  /**
   * The URL where the webhook will be sent
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook
   */
  method: HttpMethod;
  /**
   * HTTP headers to include in the webhook request. Null if no custom headers
   */
  headers: Json | null;
  /**
   * JSON payload to send with the webhook. Null if no payload
   */
  payload: Json | null;
  /**
   * Retry configuration for failed webhook attempts. Null if using default retry settings
   */
  retry_config: RetryConfig | null;
  /**
   * HTTP status code from the webhook response. Null if not yet executed or execution failed
   */
  response_status: number | null;
  /**
   * HTTP headers from the webhook response. Null if not yet executed or execution failed
   */
  response_headers: Json | null;
  /**
   * Response body from the webhook (truncated to 1KB). Null if not yet executed or execution failed
   */
  response_body: string | null;
  /**
   * Duration of the webhook request in milliseconds. Null if not yet executed
   */
  response_duration: number | null;
  /**
   * Error message if the webhook execution failed. Null if execution succeeded or not yet executed
   */
  response_error: string | null;
  /**
   * ISO timestamp when the event was created
   */
  created_at: string | null;
  /**
   * ISO timestamp when the event was last updated
   */
  updated_at: string | null;
  /**
   * ID of the team that owns this event
   */
  team_id: string | null;
}
