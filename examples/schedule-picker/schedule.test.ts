import { expect, test } from "bun:test";
import { buildSchedule } from "./schedule";

test("converts local time without incorrectly applying a fixed UTC offset", () => {
  expect(
    buildSchedule({
      cadence: "weekdays",
      time: "09:05",
      timezone: "America/New_York",
    }),
  ).toEqual({ cron_expression: "5 9 * * 1-5", timezone: "America/New_York" });
});
test("supports Sunday and midnight", () => {
  expect(
    buildSchedule({
      cadence: "weekly",
      time: "00:00",
      weekday: 0,
      timezone: "UTC",
    }).cron_expression,
  ).toBe("0 0 * * 0");
});
test("rejects invalid hours, weekdays, and timezones", () => {
  expect(() =>
    buildSchedule({ cadence: "daily", time: "24:00", timezone: "UTC" }),
  ).toThrow();
  expect(() =>
    buildSchedule({
      cadence: "weekly",
      time: "09:00",
      weekday: 7,
      timezone: "UTC",
    }),
  ).toThrow();
  expect(() =>
    buildSchedule({ cadence: "daily", time: "09:00", timezone: "Not/A_Zone" }),
  ).toThrow();
});
