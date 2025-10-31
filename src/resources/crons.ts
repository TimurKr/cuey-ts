import type {
  ApiSuccess,
  ApiSuccessWithPagination,
  CreateCronInput,
  CronsQueryParams,
  UpdateCronInput,
} from "../types/api";
import type { Cron } from "../types/models";
import { HttpClient } from "../utils/http";
import { BaseResource } from "./base-resource";

/**
 * Resource class for managing cron jobs
 */
export class CronsResource extends BaseResource {
  constructor(http: HttpClient, webhookBaseUrl: string | undefined) {
    super(http, webhookBaseUrl);
  }

  /**
   * List all cron jobs with optional pagination and filters
   *
   * @param params - Query parameters for filtering and pagination
   * @param params.page - Page number (0-indexed), defaults to 0
   * @param params.limit - Number of items per page (1-1000), defaults to 100
   * @param params.is_active - Filter by active status (true/false)
   * @returns Promise resolving to paginated list of cron jobs
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {BadRequestError} When query parameters are invalid
   * @throws {InternalServerError} When a server error occurs
   */
  async list(
    params?: CronsQueryParams,
  ): Promise<ApiSuccessWithPagination<Cron>> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) {
      queryParams.set("page", params.page.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.set("limit", params.limit.toString());
    }
    if (params?.is_active !== undefined) {
      queryParams.set("is_active", params.is_active.toString());
    }

    const queryString = queryParams.toString();
    const path = `/api/v1/crons${queryString ? `?${queryString}` : ""}`;

    return this.http.get<ApiSuccessWithPagination<Cron>>(path);
  }

  /**
   * Get a single cron job by ID
   *
   * @param id - The UUID of the cron job to retrieve
   * @returns Promise resolving to the cron job object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the cron job is not found
   * @throws {InternalServerError} When a server error occurs
   */
  async get(id: string): Promise<Cron> {
    const response = await this.http.get<ApiSuccess<Cron>>(
      `/api/v1/crons/${id}`,
    );
    return response.data;
  }

  /**
   * Create a new cron job that will repeat according to the cron expression
   *
   * @param input - Cron job creation parameters
   * @param input.webhook_url - The URL to send the webhook to (must be a valid URL)
   * @param input.method - HTTP method to use (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Defaults to 'POST' if not specified
   * @param input.cron_expression - Cron expression defining the schedule (e.g., '0 0 * * *' for daily at midnight)
   * @param input.timezone - Optional timezone for the cron expression (e.g., 'America/New_York')
   * @param input.headers - Optional HTTP headers to include in the webhook request
   * @param input.payload - Optional JSON payload to send with the webhook
   * @param input.retry_config - Optional retry configuration for failed webhooks
   * @param input.is_active - Whether the cron job is active (defaults to true)
   * @returns Promise resolving to the created cron job object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {ValidationError} When input validation fails (e.g., invalid cron expression)
   * @throws {BadRequestError} When the request is invalid
   * @throws {InternalServerError} When a server error occurs
   */
  async create(input: CreateCronInput): Promise<Cron> {
    // Validate and normalize input
    const validatedInput: CreateCronInput = {
      ...input,
      method: this.validateMethod(input.method ?? "POST"),
      webhook_url: this.validateAndNormalizeWebhookUrl(input.webhook_url),
    };

    this.validateRetryConfig(validatedInput.retry_config ?? null);
    this.validateHeaders(validatedInput.headers ?? null);

    const response = await this.http.post<ApiSuccess<Cron>>(
      "/api/v1/crons",
      validatedInput,
    );
    return response.data;
  }

  /**
   * Update an existing cron job
   *
   * @param id - The UUID of the cron job to update
   * @param input - Cron job update parameters
   * @param input.webhook_url - The URL to send the webhook to (must be a valid URL)
   * @param input.method - HTTP method to use
   * @param input.cron_expression - Cron expression defining the schedule
   * @param input.timezone - Optional timezone for the cron expression
   * @param input.headers - Optional HTTP headers to include in the webhook request
   * @param input.payload - Optional JSON payload to send with the webhook
   * @param input.retry_config - Optional retry configuration for failed webhooks
   * @param input.is_active - Whether the cron job is active
   * @returns Promise resolving to the updated cron job object
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the cron job is not found
   * @throws {ValidationError} When input validation fails
   * @throws {BadRequestError} When the request is invalid
   * @throws {InternalServerError} When a server error occurs
   */
  async update(id: string, input: UpdateCronInput): Promise<Cron> {
    // Validate and normalize input
    const validatedInput: UpdateCronInput = {
      ...input,
      method: this.validateMethod(input.method),
      webhook_url: this.validateAndNormalizeWebhookUrl(input.webhook_url),
    };

    this.validateRetryConfig(validatedInput.retry_config ?? null);
    this.validateHeaders(validatedInput.headers ?? null);

    const response = await this.http.put<ApiSuccess<Cron>>(
      `/api/v1/crons/${id}`,
      validatedInput,
    );
    return response.data;
  }

  /**
   * Delete a cron job
   *
   * @param id - The UUID of the cron job to delete
   * @returns Promise resolving when the cron job is successfully deleted
   * @throws {UnauthorizedError} When API key is invalid or missing
   * @throws {NotFoundError} When the cron job is not found
   * @throws {InternalServerError} When a server error occurs
   */
  async delete(id: string): Promise<void> {
    await this.http.delete<ApiSuccess<{ success: true }>>(
      `/api/v1/crons/${id}`,
    );
  }
}
