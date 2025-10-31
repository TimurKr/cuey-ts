import type { HttpMethod, Json, RetryConfig } from "./models";

/**
 * API error response structure
 */
export interface ApiError {
  /**
   * Error information
   */
  error: {
    /**
     * Human-readable error message
     */
    message: string;
    /**
     * Error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_ERROR')
     */
    code?: string;
    /**
     * Additional error details, often containing validation errors or context
     */
    details?: unknown;
  };
}

/**
 * API success response structure
 */
export interface ApiSuccess<T> {
  /**
   * The response data
   */
  data: T;
}

/**
 * API success response with pagination
 */
export interface ApiSuccessWithPagination<T> {
  /**
   * Array of items in the current page
   */
  data: T[];
  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Current page number (0-indexed)
     */
    page: number;
    /**
     * Number of items per page
     */
    limit: number;
    /**
     * Total number of items across all pages
     */
    total: number;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /**
   * Page number (0-indexed). Defaults to 0
   */
  page?: number;
  /**
   * Number of items per page (1-1000). Defaults to 100
   */
  limit?: number;
}

/**
 * Crons query parameters
 */
export interface CronsQueryParams extends PaginationParams {
  /**
   * Filter by active status. If true, only returns active cron jobs. If false, only returns inactive ones
   */
  is_active?: boolean;
}

/**
 * Events query parameters
 */
export interface EventsQueryParams extends PaginationParams {
  /**
   * Filter by event status
   */
  status?: "pending" | "processing" | "success" | "failed";
  /**
   * Filter by cron job ID. Only returns events created by the specified cron job
   */
  cron_id?: string;
}

/**
 * Create cron request payload
 */
export interface CreateCronInput {
  /**
   * The URL where the webhook will be sent. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook. Defaults to 'POST' if not specified
   */
  method?: HttpMethod;
  /**
   * Cron expression defining when the webhook should be executed (e.g., '0 0 * * *' for daily at midnight)
   */
  cron_expression: string;
  /**
   * Timezone for the cron expression (e.g., 'America/New_York'). Defaults to UTC if not specified
   */
  timezone?: string | null;
  /**
   * HTTP headers to include in the webhook request. Keys and values must be strings
   */
  headers?: Record<string, string> | null;
  /**
   * JSON payload to send with the webhook. Can be any valid JSON value
   */
  payload?: Json | null;
  /**
   * Retry configuration for failed webhook attempts. If not specified, uses default retry settings
   */
  retry_config?: RetryConfig | null;
  /**
   * Whether the cron job should be active. Defaults to true if not specified
   */
  is_active?: boolean;
}

/**
 * Update cron request payload (all fields optional except webhook_url, method, cron_expression)
 */
export interface UpdateCronInput {
  /**
   * The URL where the webhook will be sent. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook. Defaults to 'POST' if not specified
   */
  method?: HttpMethod;
  /**
   * Cron expression defining when the webhook should be executed (e.g., '0 0 * * *' for daily at midnight)
   */
  cron_expression: string;
  /**
   * Timezone for the cron expression (e.g., 'America/New_York'). Set to null to use UTC
   */
  timezone?: string | null;
  /**
   * HTTP headers to include in the webhook request. Keys and values must be strings. Set to null to remove headers
   */
  headers?: Record<string, string> | null;
  /**
   * JSON payload to send with the webhook. Can be any valid JSON value. Set to null to remove payload
   */
  payload?: Json | null;
  /**
   * Retry configuration for failed webhook attempts. Set to null to use default retry settings
   */
  retry_config?: RetryConfig | null;
  /**
   * Whether the cron job should be active
   */
  is_active?: boolean;
}

/**
 * Create event request payload
 */
export interface CreateEventInput {
  /**
   * The URL where the webhook will be sent. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook. Defaults to 'POST' if not specified
   */
  method?: HttpMethod;
  /**
   * ISO timestamp when the event should be executed. Must be in the future
   */
  scheduled_at: string;
  /**
   * HTTP headers to include in the webhook request. Keys and values must be strings
   */
  headers?: Record<string, string> | null;
  /**
   * JSON payload to send with the webhook. Can be any valid JSON value
   */
  payload?: Json | null;
  /**
   * Retry configuration for failed webhook attempts. If not specified, uses default retry settings
   */
  retry_config?: RetryConfig | null;
}

/**
 * Update event request payload (all fields optional except webhook_url, method, scheduled_at)
 */
export interface UpdateEventInput {
  /**
   * The URL where the webhook will be sent. Can be a full URL or a relative path (e.g., '/webhook') if baseUrl is configured
   */
  webhook_url: string;
  /**
   * HTTP method to use when sending the webhook. Defaults to 'POST' if not specified
   */
  method?: HttpMethod;
  /**
   * ISO timestamp when the event should be executed. Must be in the future
   */
  scheduled_at: string;
  /**
   * HTTP headers to include in the webhook request. Keys and values must be strings. Set to null to remove headers
   */
  headers?: Record<string, string> | null;
  /**
   * JSON payload to send with the webhook. Can be any valid JSON value. Set to null to remove payload
   */
  payload?: Json | null;
  /**
   * Retry configuration for failed webhook attempts. Set to null to use default retry settings
   */
  retry_config?: RetryConfig | null;
}
