import type {
  ApiSuccess,
  ApiSuccessWithPagination,
  CreateEventInput,
  EventsQueryParams,
  UpdateEventInput,
} from "../types/api";
import type { Event } from "../types/models";
import { HttpClient } from "../utils/http";
import { BaseResource } from "./base-resource";

/**
 * Resource class for managing events
 */
export class EventsResource extends BaseResource {
  constructor(http: HttpClient, webhookBaseUrl: string | undefined) {
    super(http, webhookBaseUrl);
  }

  /**
   * List all events with optional pagination and filters
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.page - Page number (0-indexed), defaults to 0
   * @param params.limit - Number of items per page (1-1000), defaults to 100
   * @param params.status - Filter by event status (pending, processing, success, failed)
   * @param params.cron_id - Filter by cron job ID
   * @returns Promise resolving to paginated list of events
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {BadRequestError} When query parameters are invalid
   * @throws {InternalServerError} When a server error occurs
   */
  async list(
    params?: EventsQueryParams,
  ): Promise<ApiSuccessWithPagination<Event>> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) {
      queryParams.set("page", params.page.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.set("limit", params.limit.toString());
    }
    if (params?.status !== undefined) {
      queryParams.set("status", params.status);
    }
    if (params?.cron_id !== undefined) {
      queryParams.set("cron_id", params.cron_id);
    }

    const queryString = queryParams.toString();
    const path = `/api/v1/events${queryString ? `?${queryString}` : ""}`;

    return this.http.get<ApiSuccessWithPagination<Event>>(path);
  }

  /**
   * Get a single event by ID
   *
   * @param id - The UUID of the event to retrieve
   * @returns Promise resolving to the event object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the event is not found
   * @throws {InternalServerError} When a server error occurs
   */
  async get(id: string): Promise<Event> {
    const response = await this.http.get<ApiSuccess<Event>>(
      `/api/v1/events/${id}`,
    );
    return response.data;
  }

  /**
   * Create a new event scheduled for future execution
   *
   * @param input - Event creation parameters
   * @param input.webhook_url - The URL to send the webhook to (must be a valid URL)
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
  async create(input: CreateEventInput): Promise<Event> {
    // Validate and normalize input
    this.validateScheduledAt(input.scheduled_at);

    const validatedInput: CreateEventInput = {
      ...input,
      method: this.validateMethod(input.method ?? "POST"),
      webhook_url: this.validateAndNormalizeWebhookUrl(input.webhook_url),
    };

    this.validateRetryConfig(validatedInput.retry_config ?? null);
    this.validateHeaders(validatedInput.headers ?? null);

    const response = await this.http.post<ApiSuccess<Event>>(
      "/api/v1/events",
      validatedInput,
    );
    return response.data;
  }

  /**
   * Update an existing event
   *
   * @param id - The UUID of the event to update
   * @param input - Event update parameters
   * @param input.webhook_url - The URL to send the webhook to (must be a valid URL)
   * @param input.method - HTTP method to use
   * @param input.scheduled_at - ISO timestamp when the event should be executed (must be in the future)
   * @param input.headers - Optional HTTP headers to include in the webhook request
   * @param input.payload - Optional JSON payload to send with the webhook
   * @param input.retry_config - Optional retry configuration for failed webhooks
   * @returns Promise resolving to the updated event object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the event is not found
   * @throws {ValidationError} When input validation fails
   * @throws {BadRequestError} When the request is invalid (e.g., event is not in pending status, scheduled_at is in the past)
   * @throws {InternalServerError} When a server error occurs
   */
  async update(id: string, input: UpdateEventInput): Promise<Event> {
    // Validate and normalize input
    this.validateScheduledAt(input.scheduled_at);

    const validatedInput: UpdateEventInput = {
      ...input,
      method: this.validateMethod(input.method),
      webhook_url: this.validateAndNormalizeWebhookUrl(input.webhook_url),
    };

    this.validateRetryConfig(validatedInput.retry_config ?? null);
    this.validateHeaders(validatedInput.headers ?? null);

    const response = await this.http.put<ApiSuccess<Event>>(
      `/api/v1/events/${id}`,
      validatedInput,
    );
    return response.data;
  }

  /**
   * Delete an event
   *
   * @param id - The UUID of the event to delete
   * @returns Promise resolving when the event is successfully deleted
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the event is not found
   * @throws {BadRequestError} When the event cannot be deleted (e.g., event was created by a cron job, event is not in pending status)
   * @throws {InternalServerError} When a server error occurs
   */
  async delete(id: string): Promise<void> {
    await this.http.delete<ApiSuccess<{ success: true }>>(
      `/api/v1/events/${id}`,
    );
  }
}
