import { CUEY_API_BASE_URL } from "../constants";
import type { ApiError } from "../types/api";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../types/errors";

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /**
   * Function that resolves the API key. Called when making requests.
   * Should throw an error if the API key cannot be resolved.
   */
  getApiKey: () => string;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * HTTP client utility class
 */
export class HttpClient {
  private readonly getApiKey: () => string;

  constructor(config: HttpClientConfig) {
    this.getApiKey = config.getApiKey;
  }

  /**
   * Makes an HTTP request to the API
   *
   * @param path - The API endpoint path (e.g., '/api/v1/crons')
   * @param options - Request options
   * @param options.method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param options.body - Request body to send (will be JSON stringified)
   * @param options.headers - Additional headers to include in the request
   * @returns Promise resolving to the parsed response data
   * @throws {UnauthorizedError} When API key is invalid or missing (401)
   * @throws {NotFoundError} When the resource is not found (404)
   * @throws {BadRequestError} When the request is invalid (400)
   * @throws {ValidationError} When request validation fails (400)
   * @throws {InternalServerError} When a server error occurs (500+)
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const apiKey = this.getApiKey();
    const url = `${CUEY_API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
    });

    // Parse response body
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch (error) {
        throw new InternalServerError(
          `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      throw this.handleError(response.status, data);
    }

    return data as T;
  }

  /**
   * Handles error responses and throws appropriate error types
   */
  private handleError(statusCode: number, data: unknown): never {
    const errorData = data as ApiError;

    if (statusCode === 401) {
      throw new UnauthorizedError(
        errorData.error?.message || "Unauthorized. Invalid or missing API key.",
        errorData.error?.details,
      );
    }

    if (statusCode === 404) {
      throw new NotFoundError(
        errorData.error?.message || "Resource not found.",
        errorData.error?.details,
      );
    }

    if (statusCode === 400) {
      const code = errorData.error?.code;
      if (code === "VALIDATION_ERROR") {
        throw new ValidationError(
          errorData.error?.message || "Validation error",
          errorData.error?.details,
        );
      }
      throw new BadRequestError(
        errorData.error?.message || "Bad request",
        errorData.error?.details,
      );
    }

    if (statusCode >= 500) {
      throw new InternalServerError(
        errorData.error?.message || "An internal server error occurred.",
        errorData.error?.details,
      );
    }

    throw new InternalServerError(
      `Unexpected error: ${statusCode}`,
      errorData.error?.details,
    );
  }

  /**
   * GET request
   *
   * @param path - The API endpoint path
   * @returns Promise resolving to the parsed response data
   * @throws {UnauthorizedError} When API key is invalid or missing (401)
   * @throws {NotFoundError} When the resource is not found (404)
   * @throws {BadRequestError} When the request is invalid (400)
   * @throws {InternalServerError} When a server error occurs (500+)
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  /**
   * POST request
   *
   * @param path - The API endpoint path
   * @param body - Request body to send (will be JSON stringified)
   * @returns Promise resolving to the parsed response data
   * @throws {UnauthorizedError} When API key is invalid or missing (401)
   * @throws {ValidationError} When request validation fails (400)
   * @throws {BadRequestError} When the request is invalid (400)
   * @throws {InternalServerError} When a server error occurs (500+)
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  /**
   * PUT request
   *
   * @param path - The API endpoint path
   * @param body - Request body to send (will be JSON stringified)
   * @returns Promise resolving to the parsed response data
   * @throws {UnauthorizedError} When API key is invalid or missing (401)
   * @throws {NotFoundError} When the resource is not found (404)
   * @throws {ValidationError} When request validation fails (400)
   * @throws {BadRequestError} When the request is invalid (400)
   * @throws {InternalServerError} When a server error occurs (500+)
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  /**
   * DELETE request
   *
   * @param path - The API endpoint path
   * @returns Promise resolving to the parsed response data
   * @throws {UnauthorizedError} When API key is invalid or missing (401)
   * @throws {NotFoundError} When the resource is not found (404)
   * @throws {BadRequestError} When the request is invalid (400)
   * @throws {InternalServerError} When a server error occurs (500+)
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
