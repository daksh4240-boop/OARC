import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import { once } from "node:events";
import { createAuthRouter } from "../src/routes/auth.ts";
import { getSessionSecret } from "../src/lib/session.ts";

process.env.OARC_PASSCODE = "test-passcode-only";
process.env.OARC_ALLOWED_EMAILS = "board@example.test";

async function withServer(run: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "a-test-session-secret-that-is-32-characters", resave: false, saveUninitialized: false }));
  app.get("/seed", (req, res) => { req.session.email = "guest@example.test"; res.json({ ok: true }); });
  app.use(createAuthRouter());
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

function login(base: string, body?: unknown, cookie?: string) {
  return fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
const credentials = { email: " BOARD@example.test ", passcode: "test-passcode-only" };
const cookieOf = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];

test("malformed login bodies return 400 instead of throwing", async () => {
  await withServer(async (base) => {
    for (const body of [undefined, {}, { email: 123, passcode: "test" }, { email: "board@example.test", passcode: 123 }]) {
      const res = await login(base, body);
      assert.equal(res.status, 400);
    }
  });
});

test("reject wrong credentials, regenerate session on login, and invalidate on logout", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/auth/me`)).status, 401);
    assert.equal((await login(base, { ...credentials, passcode: "wrong" })).status, 403);
    assert.equal((await login(base, { ...credentials, email: "other@example.test" })).status, 403);
    const seed = await fetch(`${base}/seed`);
    const oldCookie = cookieOf(seed);
    const res = await login(base, credentials, oldCookie);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { email: "board@example.test" });
    const cookie = cookieOf(res);
    assert.notEqual(cookie, oldCookie);
    assert.equal((await fetch(`${base}/auth/me`, { headers: { cookie: oldCookie } })).status, 401);
    assert.equal((await fetch(`${base}/auth/me`, { headers: { cookie } })).status, 200);
    const logout = await fetch(`${base}/auth/logout`, { method: "POST", headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie")!, /Expires=Thu, 01 Jan 1970/);
    assert.equal((await fetch(`${base}/auth/me`, { headers: { cookie } })).status, 401);
  });
});

test("repeated login guesses are rate limited", async () => {
  await withServer(async (base) => {
    for (let i = 0; i < 10; i++) assert.equal((await login(base, { ...credentials, passcode: "wrong" })).status, 403);
    const res = await login(base, credentials);
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get("retry-after")) > 0);
  });
});

test("production refuses missing or short session secrets", () => {
  assert.throws(() => getSessionSecret({ NODE_ENV: "production" }), /SESSION_SECRET/);
  assert.throws(() => getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: "short" }), /SESSION_SECRET/);
  assert.equal(getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(32) }), "x".repeat(32));
  assert.notEqual(getSessionSecret({}), getSessionSecret({}));
});
