import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import { createAuthRouter } from "./auth";
import membersRouter from "./members";
import eventsRouter from "./events";
import attendanceRouter from "./attendance";
import tasksRouter from "./tasks";
import fundraisersRouter from "./fundraisers";
import dashboardRouter from "./dashboard";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(createAuthRouter());

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const email = req.session.email;
  if (!email) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }
  next();
}

router.use(requireAuth);
router.use(membersRouter);
router.use(eventsRouter);
router.use(attendanceRouter);
router.use(tasksRouter);
router.use(fundraisersRouter);
router.use(dashboardRouter);
router.use(announcementsRouter);

export default router;
