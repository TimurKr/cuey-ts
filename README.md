# cuey

TypeScript client library for the Cuey REST API. This package provides a type-safe, object-based interface for scheduling webhooks and managing cron jobs.

## Installation

```bash
npm install cuey
```

## Quick Start

### Using the Default Instance

The easiest way to get started is using the default `cuey` instance, which automatically reads configuration from environment variables:

```typescript
import { cuey } from "cuey";

// Schedule a one-time event
const event = await cuey.schedule({
  webhook_url: "/webhook",
  method: "POST",
  scheduled_at: "2024-12-31T00:00:00Z",
  payload: { message: "Hello, world!" },
});

// Create a cron job that runs daily
const cron = await cuey.repeat({
  webhook_url: "/daily-report",
  method: "POST",
  cron_expression: "0 0 * * *",
  is_active: true,
});
```

Make sure to set the following environment variables:

- `CUEY_API_KEY` - Your API key for authentication
- `CUEY_BASE_URL` - Base URL for relative webhook URLs (optional)

### Using a Custom Instance

You can also create a custom `Cuey` instance with explicit configuration:

```typescript
import { Cuey } from "cuey";

const client = new Cuey({
  baseUrl: "https://example.com",
  apiKey: "your-api-key",
});

// List crons
const { data, pagination } = await client.crons.list({ page: 0, limit: 10 });

// Get a single event
const event = await client.events.get("event-id");
```

## Configuration

The `Cuey` class accepts optional configuration options:

- `baseUrl` (optional): Base URL for webhook URLs. If provided, relative webhook URLs (e.g., `/webhook`) will be resolved against this base URL. Falls back to `CUEY_BASE_URL` environment variable if not provided.
- `apiKey` (optional): API key for authentication. Falls back to `CUEY_API_KEY` environment variable if not provided.

If neither `apiKey` nor `CUEY_API_KEY` is provided, an error will be thrown when making API calls.

### Environment Variables

The SDK supports the following environment variables:

- `CUEY_API_KEY`: API key for authentication (required if not provided in config)
- `CUEY_BASE_URL`: Base URL for resolving relative webhook URLs (optional)

Example:

```bash
export CUEY_API_KEY="your-api-key"
export CUEY_BASE_URL="https://example.com"
```

## API Reference

### Main Client Methods

The `Cuey` class provides convenience methods for common operations:

#### `schedule(input: CreateEventInput): Promise<Event>`

Schedule an event for future execution. Alias for `client.events.create()`.

```typescript
const event = await client.schedule({
  webhook_url: "https://example.com/webhook",
  method: "POST",
  scheduled_at: "2024-12-31T00:00:00Z",
  headers: { "X-Custom-Header": "value" },
  payload: { data: "value" },
  retry_config: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffType: "exponential",
  },
});
```

#### `repeat(input: CreateCronInput): Promise<Cron>`

Create a cron job that will repeat according to the cron expression. Alias for `client.crons.create()`.

```typescript
const cron = await client.repeat({
  webhook_url: "https://example.com/webhook",
  method: "POST",
  cron_expression: "0 0 * * *", // Daily at midnight
  timezone: "America/New_York",
  is_active: true,
  payload: { report: "daily" },
});
```

### Crons Resource

#### List Crons

```typescript
const { data, pagination } = await client.crons.list({
  page?: number;        // Default: 0. Specifying an out of range page number will throw InternalServerError
  limit?: number;       // Default: 100
  is_active?: boolean;  // Filter by active status
});
```

Returns a paginated list of cron jobs with `data` (array of `Cron`) and `pagination` metadata.

**Note:** Requesting a page number that is out of range (e.g., page 100 when only 10 pages exist) will throw an `InternalServerError`.

#### Get Cron

```typescript
const cron = await client.crons.get(id: string);
```

Returns a single cron job by ID.

#### Create Cron

```typescript
const cron = await client.crons.create({
  webhook_url: string;  // Full URL or relative path (e.g., '/webhook') if baseUrl is configured
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  cron_expression: string;  // e.g., '0 0 * * *' for daily at midnight
  timezone?: string | null;  // e.g., 'America/New_York'
  headers?: Record<string, string> | null;
  payload?: Json | null;
  retry_config?: {
    maxRetries: number;  // 1-10
    backoffMs: number;  // 100-5000
    backoffType: 'exponential' | 'linear';
  } | null;
  is_active?: boolean;  // Default: true
});
```

#### Update Cron

```typescript
const cron = await client.crons.update(id: string, {
  webhook_url: string;
  method: HttpMethod;
  cron_expression: string;
  timezone?: string | null;
  headers?: Record<string, string> | null;
  payload?: Json | null;
  retry_config?: RetryConfig | null;
  is_active?: boolean;
});
```

#### Delete Cron

```typescript
await client.crons.delete(id: string);
```

### Events Resource

#### List Events

```typescript
const { data, pagination } = await client.events.list({
  page?: number;        // Default: 0. Specifying an out of range page number will throw InternalServerError
  limit?: number;       // Default: 100
  status?: 'pending' | 'processing' | 'success' | 'failed';
  cron_id?: string;     // Filter by cron ID
});
```

Returns a paginated list of events with `data` (array of `Event`) and `pagination` metadata.

**Note:** Requesting a page number that is out of range (e.g., page 100 when only 10 pages exist) will throw an `InternalServerError`.

#### Get Event

```typescript
const event = await client.events.get(id: string);
```

Returns a single event by ID.

#### Create Event

```typescript
const event = await client.events.create({
  webhook_url: string;  // Full URL or relative path (e.g., '/webhook') if baseUrl is configured
  method: HttpMethod;
  scheduled_at: string;  // ISO timestamp, must be in the future
  headers?: Record<string, string> | null;
  payload?: Json | null;
  retry_config?: RetryConfig | null;
});
```

**Note:** The `scheduled_at` timestamp must be in the future. The SDK validates this client-side before making the API call.

#### Update Event

```typescript
const event = await client.events.update(id: string, {
  webhook_url: string;
  method: HttpMethod;
  scheduled_at: string;  // ISO timestamp, must be in the future
  headers?: Record<string, string> | null;
  payload?: Json | null;
  retry_config?: RetryConfig | null;
});
```

**Note:** Only pending events can be updated.

#### Delete Event

```typescript
await client.events.delete(id: string);
```

**Note:** Only pending events that were created manually (not by cron jobs) can be deleted.

## Webhook URLs

Webhook URLs can be provided in two formats:

1. **Full URL**: A complete URL starting with `http://` or `https://`

   ```typescript
   webhook_url: "https://example.com/webhook";
   ```

2. **Relative Path**: A path starting with `/` (e.g., `/webhook`). Requires `baseUrl` to be configured (via config or `CUEY_BASE_URL` environment variable)
   ```typescript
   // With baseUrl configured
   const client = new Cuey({ baseUrl: "https://example.com" });
   await client.schedule({
     webhook_url: "/webhook", // Resolves to https://example.com/webhook
     method: "POST",
     scheduled_at: "2024-12-31T00:00:00Z",
   });
   ```

## Error Handling

The SDK provides typed error classes for different error scenarios:

```typescript
import {
  CueyError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  InternalServerError,
} from "cuey";

try {
  const cron = await client.crons.get("invalid-id");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error("Cron not found:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation errors:", error.validationErrors);
  } else if (error instanceof CueyError) {
    console.error("API error:", error.code, error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Error Types

- `UnauthorizedError` (401): Invalid or missing API key
- `NotFoundError` (404): Resource not found
- `BadRequestError` (400): Invalid request
- `ValidationError` (400): Request validation failed (includes `validationErrors` property with detailed validation errors)
- `InternalServerError` (500+): Server error

## Types

All types are exported from the package:

```typescript
import type {
  Cron,
  Event,
  HttpMethod,
  EventStatus,
  RetryConfig,
  CreateCronInput,
  UpdateCronInput,
  CreateEventInput,
  UpdateEventInput,
  CronsQueryParams,
  EventsQueryParams,
  CueyConfig,
} from "cuey";

// Also export the Cuey class and default instance
import { Cuey, cuey } from "cuey";
```

## Examples

### Scheduling a One-Time Event

```typescript
import { cuey } from "cuey";

const event = await cuey.schedule({
  webhook_url: "https://api.example.com/webhook",
  method: "POST",
  scheduled_at: "2024-12-31T23:59:59Z",
  headers: {
    Authorization: "Bearer token",
    "Content-Type": "application/json",
  },
  payload: {
    message: "Happy New Year!",
    timestamp: new Date().toISOString(),
  },
  retry_config: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffType: "exponential",
  },
});

console.log("Event scheduled:", event.id);
```

### Creating a Cron Job

```typescript
import { Cuey } from "cuey";

const client = new Cuey({
  apiKey: process.env.CUEY_API_KEY,
  baseUrl: "https://api.example.com",
});

// Create a cron that runs every hour
const cron = await client.repeat({
  webhook_url: "/webhooks/hourly-report",
  method: "POST",
  cron_expression: "0 * * * *",
  timezone: "America/New_York",
  is_active: true,
  payload: {
    report_type: "hourly",
  },
});

console.log("Cron created:", cron.id);
```

### Listing and Filtering Events

```typescript
import { cuey } from "cuey";

// List failed events
const { data: failedEvents } = await cuey.events.list({
  status: "failed",
  limit: 50,
});

console.log(`Found ${failedEvents.length} failed events`);

// List events for a specific cron
const { data: cronEvents } = await cuey.events.list({
  cron_id: "cron-uuid-here",
  page: 0,
  limit: 100,
});
```

### Updating a Cron Job

```typescript
import { cuey } from "cuey";

// Update cron to run every 30 minutes instead
await cuey.crons.update("cron-id-here", {
  webhook_url: "https://example.com/webhook",
  method: "POST",
  cron_expression: "*/30 * * * *",
  is_active: true,
});

// Temporarily disable a cron
await cuey.crons.update("cron-id-here", {
  webhook_url: "https://example.com/webhook",
  method: "POST",
  cron_expression: "0 0 * * *",
  is_active: false,
});
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (for TypeScript projects)

## API Base URL

The SDK uses `https://cuey.dev` as the API base URL. This is configured internally and cannot be changed.

## Testing

The test suite uses Bun's built-in test runner and requires a valid API key to run.

### Running Tests Locally

1. **Set up your API key:**
   - Create a `.env.local` file in the project root (or copy `.env.example`)
   - Add your API key:
     ```bash
     TEST_API_KEY=your-api-key-here
     ```
   - To get an API key:
     - Create an account at [https://cuey.dev/dashboard](https://cuey.dev/dashboard)
     - Create a team
     - Generate an API key from your team settings

2. **Run the tests:**

   ```bash
   bun test
   ```

### CI/CD

Tests in CI/CD use GitHub Secrets to provide the `TEST_API_KEY` environment variable securely. The test account and API key are managed separately for security.

## License

MIT
