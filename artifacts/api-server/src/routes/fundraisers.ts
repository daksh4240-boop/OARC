import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fundraisersTable } from "@workspace/db";
import {
  ListFundraisersResponse,
  CreateFundraiserBody,
  UpdateFundraiserParams,
  UpdateFundraiserBody,
  UpdateFundraiserResponse,
  DeleteFundraiserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const parseFundraiser = (f: typeof fundraisersTable.$inferSelect) => ({
  ...f,
  goalAmount: parseFloat(f.goalAmount),
  raisedAmount: parseFloat(f.raisedAmount),
});

router.get("/fundraisers", async (_req, res): Promise<void> => {
  const fundraisers = await db.select().from(fundraisersTable).orderBy(fundraisersTable.id);
  res.json(ListFundraisersResponse.parse(fundraisers.map(parseFundraiser)));
});

router.post("/fundraisers", async (req, res): Promise<void> => {
  const parsed = CreateFundraiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [fundraiser] = await db.insert(fundraisersTable).values({
    ...parsed.data,
    goalAmount: String(parsed.data.goalAmount),
    raisedAmount: String(parsed.data.raisedAmount),
  }).returning();
  res.status(201).json(parseFundraiser(fundraiser));
});

router.patch("/fundraisers/:id", async (req, res): Promise<void> => {
  const params = UpdateFundraiserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFundraiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.goalAmount != null) updateData.goalAmount = String(parsed.data.goalAmount);
  if (parsed.data.raisedAmount != null) updateData.raisedAmount = String(parsed.data.raisedAmount);

  const [fundraiser] = await db.update(fundraisersTable).set(updateData).where(eq(fundraisersTable.id, params.data.id)).returning();
  if (!fundraiser) {
    res.status(404).json({ error: "Fundraiser not found" });
    return;
  }
  res.json(UpdateFundraiserResponse.parse(parseFundraiser(fundraiser)));
});

router.delete("/fundraisers/:id", async (req, res): Promise<void> => {
  const params = DeleteFundraiserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [fundraiser] = await db.delete(fundraisersTable).where(eq(fundraisersTable.id, params.data.id)).returning();
  if (!fundraiser) {
    res.status(404).json({ error: "Fundraiser not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
