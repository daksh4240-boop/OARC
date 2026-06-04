import { Router, type IRouter } from "express";
import { db, membersTable, eventsTable, tasksTable, fundraisersTable } from "@workspace/db";
import { sql, eq, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [
    memberRows,
    eventRows,
    taskRows,
    fundraiserRows,
  ] = await Promise.all([
    db.select().from(membersTable),
    db.select().from(eventsTable),
    db.select().from(tasksTable),
    db.select().from(fundraisersTable),
  ]);

  const totalMembers = memberRows.length;
  const upcomingEvents = eventRows.filter((e) => e.date >= today).length;
  const openTasks = taskRows.filter((t) => t.status !== "done").length;
  const activeFundraisers = fundraiserRows.filter((f) => f.status === "active").length;
  const totalFundsRaised = fundraiserRows.reduce((sum, f) => sum + parseFloat(f.raisedAmount), 0);
  const totalFundsGoal = fundraiserRows.reduce((sum, f) => sum + parseFloat(f.goalAmount), 0);

  // Role breakdown
  const roleMap = new Map<string, number>();
  for (const m of memberRows) {
    roleMap.set(m.role, (roleMap.get(m.role) ?? 0) + 1);
  }
  const membersByRole = Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));

  // Events by type
  const typeMap = new Map<string, number>();
  for (const e of eventRows) {
    typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + 1);
  }
  const eventsByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  // Tasks by status
  const statusMap = new Map<string, number>();
  for (const t of taskRows) {
    statusMap.set(t.status, (statusMap.get(t.status) ?? 0) + 1);
  }
  const tasksByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  res.json({
    totalMembers,
    upcomingEvents,
    openTasks,
    activeFundraisers,
    totalFundsRaised,
    totalFundsGoal,
    membersByRole,
    eventsByType,
    tasksByStatus,
  });
});

export default router;
