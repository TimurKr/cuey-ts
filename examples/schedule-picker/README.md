# Schedule picker

Let users pick a local time, a timezone, and a repeat pattern. Get a five-field cron expression back.

Copy `schedule.ts` and `schedule-picker.tsx` into your React application. The component depends only on React. It does not call Cuey, send analytics, or require an account. Style the native controls to match your app.

```tsx
import { SchedulePicker } from "./schedule-picker";

<SchedulePicker
  onChange={(schedule) => {
    // Save schedule.cron_expression and schedule.timezone in your form.
    // Send them to your authenticated backend when the user saves.
    console.log(schedule);
  }}
/>;
```

The initial selection is weekdays at 09:00 UTC. `onChange` fires after a valid user edit; initialize your form with the same default, or call `buildSchedule` yourself. Keep API keys on your backend. Authorize the user's reminder before creating or editing its schedule.

The output works with a five-field cron scheduler that supports a separate IANA timezone. Confirm your scheduler's daylight-saving behaviour. This picker supports daily, weekdays, or one weekday; it does not represent arbitrary calendar recurrence rules.

[Preview cron expressions](https://cuey.dev/tools/cron) · [User-defined scheduling guide](https://cuey.dev/guides/user-defined-schedules)

## Optional Cuey integration

```ts
import { cuey } from "cuey";

// In your authenticated backend, after validating ownership and input:
await cuey.repeat({
  webhook_url: "https://your.app/api/remind",
  method: "POST",
  cron_expression: schedule.cron_expression,
  timezone: schedule.timezone,
  payload: { reminder_id: reminder.id },
});
```

MIT licensed under this repository's LICENSE. Run the helper tests with `bun test examples/schedule-picker/schedule.test.ts`.
