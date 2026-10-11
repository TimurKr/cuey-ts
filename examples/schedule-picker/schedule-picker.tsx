"use client";

import { useId, useState } from "react";
import {
  buildSchedule,
  type CronSchedule,
  type ScheduleInput,
} from "./schedule";

/** Provider-independent schedule controls. Use onChange to update your form. */
export function SchedulePicker({
  onChange,
  defaultTimezone = "UTC",
}: {
  onChange: (schedule: CronSchedule) => void;
  defaultTimezone?: string;
}) {
  const id = useId();
  const [input, setInput] = useState<ScheduleInput>({
    cadence: "weekdays",
    time: "09:00",
    weekday: 1,
    timezone: defaultTimezone,
  });
  const [error, setError] = useState("");
  function update(patch: Partial<ScheduleInput>) {
    const next = { ...input, ...patch };
    setInput(next);
    try {
      onChange(buildSchedule(next));
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your schedule.");
    }
  }
  return (
    <fieldset>
      <legend>Choose a schedule</legend>
      <label htmlFor={`${id}-cadence`}>Repeat</label>
      <select
        id={`${id}-cadence`}
        value={input.cadence}
        onChange={(e) =>
          update({ cadence: e.target.value as ScheduleInput["cadence"] })
        }
      >
        <option value="daily">Every day</option>
        <option value="weekdays">Weekdays</option>
        <option value="weekly">Every week</option>
      </select>
      <label htmlFor={`${id}-time`}>Local time</label>
      <input
        id={`${id}-time`}
        type="time"
        value={input.time}
        onChange={(e) => update({ time: e.target.value })}
      />
      {input.cadence === "weekly" && (
        <>
          <label htmlFor={`${id}-day`}>Day</label>
          <select
            id={`${id}-day`}
            value={input.weekday}
            onChange={(e) => update({ weekday: Number(e.target.value) })}
          >
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day, n) => (
              <option value={n} key={day}>
                {day}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor={`${id}-tz`}>Timezone</label>
      <input
        id={`${id}-tz`}
        value={input.timezone}
        onChange={(e) => update({ timezone: e.target.value })}
        placeholder="America/New_York"
      />
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
