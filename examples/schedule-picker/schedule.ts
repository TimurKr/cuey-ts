export type ScheduleCadence = "daily" | "weekdays" | "weekly";
export interface ScheduleInput {
  cadence: ScheduleCadence;
  time: string;
  weekday?: number;
  timezone: string;
}
export interface CronSchedule {
  cron_expression: string;
  timezone: string;
}

/** Convert local-time controls into a five-field cron. No scheduler dependency. */
export function buildSchedule(input: ScheduleInput): CronSchedule {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(input.time);
  if (!match) throw new Error("Choose a valid time in HH:mm format.");
  if (!input.timezone) throw new Error("Choose an IANA timezone.");
  new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  let days = "*";
  if (input.cadence === "weekdays") days = "1-5";
  else if (input.cadence === "weekly") {
    if (
      !Number.isInteger(input.weekday) ||
      input.weekday! < 0 ||
      input.weekday! > 6
    ) {
      throw new Error("Choose a weekday from 0 (Sunday) to 6 (Saturday).");
    }
    days = String(input.weekday);
  } else if (input.cadence !== "daily")
    throw new Error("Choose daily, weekdays, or weekly.");
  return {
    cron_expression: `${Number(match[2])} ${Number(match[1])} * * ${days}`,
    timezone: input.timezone,
  };
}
