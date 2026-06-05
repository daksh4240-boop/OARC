import { Router } from "express";
import type { Request, Response } from "express";

const ALLOWED_EMAILS = new Set([
  "1077399@student.auhsd.us",
  "1077422@student.auhsd.us",
  "1071063@student.auhsd.us",
  "1076660@student.auhsd.us",
  "1076615@student.auhsd.us",
  "1083763@student.auhsd.us",
  "1076534@student.auhsd.us",
  "1080329@student.auhsd.us",
  "1083783@student.auhsd.us",
  "1083790@student.auhsd.us",
  "1070007@student.auhsd.us",
  "1076460@student.auhsd.us",
  "1076140@student.auhsd.us",
]);

const router = Router();

router.post("/auth/login", (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const normalized = email.trim().toLowerCase();
  if (!ALLOWED_EMAILS.has(normalized)) {
    res.status(403).json({ error: "This email is not authorized to access OARC." });
    return;
  }
  (req.session as any).email = normalized;
  res.json({ email: normalized });
});

router.get("/auth/me", (req: Request, res: Response) => {
  const email = (req.session as any)?.email;
  if (!email) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ email });
});

router.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

export { ALLOWED_EMAILS };
export default router;
