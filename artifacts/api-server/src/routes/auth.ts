import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

// Keep credentials and the school email allowlist out of the public repository.
export function createAuthRouter() {
  const passcode = process.env.OARC_PASSCODE?.trim();
  const allowedEmails = new Set((process.env.OARC_ALLOWED_EMAILS ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!passcode || allowedEmails.size === 0) {
    throw new Error("Set OARC_PASSCODE and OARC_ALLOWED_EMAILS before starting the API.");
  }
  const router = Router();
  const attempts = new Map<string, { count: number; expiresAt: number }>();

  router.post("/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, attempt] of attempts) {
      if (attempt.expiresAt <= now) attempts.delete(key);
    }
    const key = req.ip ?? "unknown";
    const attempt = attempts.get(key) ?? { count: 0, expiresAt: now + 15 * 60 * 1000 };
    if (attempt.count >= 10) {
      res.set("Retry-After", String(Math.ceil((attempt.expiresAt - now) / 1000)));
      res.status(429).json({ error: "Too many login attempts. Please try again later." });
      return;
    }
    attempts.set(key, { ...attempt, count: attempt.count + 1 });
    const { email, passcode: suppliedPasscode } = req.body ?? {};
    if (typeof email !== "string" || !email.trim() || typeof suppliedPasscode !== "string") {
      res.status(400).json({ error: "Email and passcode must be strings." });
      return;
    }
    const normalized = email.trim().toLowerCase();
    const supplied = Buffer.from(suppliedPasscode.trim());
    const expected = Buffer.from(passcode);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected) || !allowedEmails.has(normalized)) {
      res.status(403).json({ error: "Incorrect email or passcode." });
      return;
    }
    // Replace the pre-login session and persist it before the next request.
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.email = normalized;
      req.session.save((error) => {
        if (error) return next(error);
        attempts.delete(key);
        res.json({ email: normalized });
      });
    });
  });

  router.get("/auth/me", (req: Request, res: Response) => {
    const email = req.session.email;
    if (!email || !allowedEmails.has(email)) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ email });
  });

  router.post("/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("connect.sid", { path: "/" });
      res.json({ ok: true });
    });
  });
  return router;
}
