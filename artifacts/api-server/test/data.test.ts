import { test } from "node:test";
import assert from "node:assert/strict";
import { UpdateTaskBody, UpdateFundraiserBody } from "../../../lib/api-zod/src/generated/api.ts";
import { parseCalendarDate } from "../../club-hub/src/lib/calendar-date.ts";

test("PATCH contracts preserve explicit nulls when clearing fields", () => {
  assert.deepEqual(UpdateTaskBody.parse({ assignedTo: null, dueDate: null }), { assignedTo: null, dueDate: null });
  assert.deepEqual(UpdateTaskBody.parse({ title: "Keep existing assignment" }), { title: "Keep existing assignment" });
  assert.deepEqual(UpdateFundraiserBody.parse({ startDate: null, endDate: null }), { startDate: null, endDate: null });
});

test("date-only events stay on their calendar day in California, including DST", () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    for (const value of ["2026-01-01", "2026-03-08", "2026-11-01", "2026-11-02"]) {
      const date = parseCalendarDate(value);
      assert.equal(date.getDate(), Number(value.slice(8)));
      assert.equal(date.getMonth() + 1, Number(value.slice(5, 7)));
      assert.equal(date.getHours(), 0);
      const today = new Date(date); today.setHours(0, 0, 0, 0);
      assert.ok(date >= today, "today's events remain upcoming");
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});
