import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import {
  ListAnnouncementsResponse,
  CreateAnnouncementBody,
  DeleteAnnouncementParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/announcements", async (_req, res): Promise<void> => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(ListAnnouncementsResponse.parse(rows));
});

router.post("/announcements", async (req, res): Promise<void> => {
  const session = (req.session as any);
  const parsed = CreateAnnouncementBody.safeParse({ ...req.body, authorEmail: session?.email ?? "" });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(announcementsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const params = DeleteAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(announcementsTable).where(eq(announcementsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
