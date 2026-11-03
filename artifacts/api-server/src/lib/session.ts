import { randomBytes } from "node:crypto";
import "express-session";

declare module "express-session" {
  interface SessionData {
    email?: string;
  }
}

export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
  }
  return randomBytes(32).toString("hex");
}
