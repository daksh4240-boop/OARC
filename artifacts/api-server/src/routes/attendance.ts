import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, attendanceTable } from "@workspace/db";
import {
  ListAttendanceQueryParams,
  ListAttendanceResponse,
  CreateAttendanceBody,
  DeleteAttendanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/attendance", async (req, res): Promise<void> => {
  const qp = ListAttendanceQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  let query = db.select().from(attendanceTable);

  const conditions = [];
  if (qp.data.eventId != null) {
    conditions.push(eq(attendanceTable.eventId, qp.data.eventId));
  }
  if (qp.data.memberId != null) {
    conditions.push(eq(attendanceTable.memberId, qp.data.memberId));
  }

  let records;
  if (conditions.length > 0) {
    records = await db.select().from(attendanceTable).where(and(...conditions));
  } else {
    records = await query;
  }

  res.json(ListAttendanceResponse.parse(records.map((a) => ({ ...a, markedAt: a.markedAt.toISOString() }))));
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [record] = await db.insert(attendanceTable).values(parsed.data).returning();
  res.status(201).json({ ...record, markedAt: record.markedAt.toISOString() });
});

router.delete("/attendance/:id", async (req, res): Promise<void> => {
  const params = DeleteAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [record] = await db.delete(attendanceTable).where(eq(attendanceTable.id, params.data.id)).returning();
  if (!record) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
