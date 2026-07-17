import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { setupTestApp } from "./helpers.js";
import { setupTestDb, cleanTestDb, getTestPool } from "./db.js";

let request, pool;

beforeAll(async () => {
  await setupTestDb();
  const ctx = await setupTestApp();
  request = ctx.request;
});

beforeEach(async () => {
  await cleanTestDb();
  pool = getTestPool();
});

// ── AUTH ──────────────────────────────────────────────────────
describe("Auth", () => {
  it("POST /api/auth/register — creates user, returns JWT", async () => {
    const res = await request("POST", "/api/auth/register", {
      username: "testuser", email: "test@test.com", password: "secret123",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.token).toBeTruthy();
  });

  it("POST /api/auth/register — duplicate email → 409", async () => {
    await request("POST", "/api/auth/register", { username: "a", email: "dup@test.com", password: "x" });
    const res = await request("POST", "/api/auth/register", { username: "b", email: "dup@test.com", password: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/);
  });

  it("POST /api/auth/register — duplicate username → 409", async () => {
    await request("POST", "/api/auth/register", { username: "dup", email: "a@test.com", password: "x" });
    const res = await request("POST", "/api/auth/register", { username: "dup", email: "b@test.com", password: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/);
  });

  it("POST /api/auth/login — valid credentials return JWT", async () => {
    await request("POST", "/api/auth/register", { username: "u", email: "u@test.com", password: "pass123" });
    const res = await request("POST", "/api/auth/login", { email: "u@test.com", password: "pass123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe("u");
  });

  it("POST /api/auth/login — wrong password → 401", async () => {
    await request("POST", "/api/auth/register", { username: "u", email: "u@test.com", password: "pass123" });
    const res = await request("POST", "/api/auth/login", { email: "u@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});

// ── HELPERS ───────────────────────────────────────────────────
async function asUser(username) {
  await request("POST", "/api/auth/register", { username, email: `${username}@test.com`, password: "pass" });
  const login = await request("POST", "/api/auth/login", { email: `${username}@test.com`, password: "pass" });
  return { token: login.body.token, id: login.body.user.id, headers: { Authorization: `Bearer ${login.body.token}` } };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── CAMP ──────────────────────────────────────────────────────
describe("Camp", () => {
  it("POST /api/camp — creates camp with defaults", async () => {
    const user = await asUser("c1");
    const res = await request("POST", "/api/camp", { name: "Test Camp" }, auth(user.token));
    expect(res.status).toBe(201);
    expect(res.body.camp.name).toBe("Test Camp");
    expect(res.body.camp.rep).toBe(8);
    expect(res.body.camp.cash).toBe(100000);
  });

  it("POST /api/camp — second camp → 409", async () => {
    const user = await asUser("c2");
    await request("POST", "/api/camp", { name: "First" }, auth(user.token));
    const res = await request("POST", "/api/camp", { name: "Second" }, auth(user.token));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/);
  });

  it("GET /api/camp — before create → 404", async () => {
    const user = await asUser("c3");
    const res = await request("GET", "/api/camp", null, auth(user.token));
    expect(res.status).toBe(404);
  });

  it("GET /api/camp — after create → 200 with camp", async () => {
    const user = await asUser("c4");
    await request("POST", "/api/camp", { name: "My Camp" }, auth(user.token));
    const res = await request("GET", "/api/camp", null, auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.camp.name).toBe("My Camp");
  });
});

// ── FIGHTERS ──────────────────────────────────────────────────
describe("Fighters", () => {
  it("POST /api/fighters — without camp → 404", async () => {
    const user = await asUser("f1");
    const res = await request("POST", "/api/fighters", null, auth(user.token));
    expect(res.status).toBe(404);
  });

  it("POST /api/fighters — generates fighter with valid attrs", async () => {
    const user = await asUser("f2");
    await request("POST", "/api/camp", { name: "Gym" }, auth(user.token));
    const res = await request("POST", "/api/fighters", null, auth(user.token));
    expect(res.status).toBe(201);
    expect(res.body.fighter.name).toBeTruthy();
    expect(res.body.fighter.archetype).toBeTruthy();
    expect(res.body.fighter.attrs).toBeTruthy();
    const CORE_ATTRS = ["striking","wrestling","bjj","footwork","strength","cardio","chin","fightIQ"];
    const attrKeys = Object.keys(res.body.fighter.attrs);
    expect(attrKeys.length).toBeGreaterThanOrEqual(8);
    expect(attrKeys).toEqual(expect.arrayContaining(CORE_ATTRS));
  });

  it("GET /api/fighters — scoped to user's camp", async () => {
    const u1 = await asUser("f3");
    const u2 = await asUser("f4");
    await request("POST", "/api/camp", { name: "Gym A" }, auth(u1.token));
    await request("POST", "/api/camp", { name: "Gym B" }, auth(u2.token));
    await request("POST", "/api/fighters", null, auth(u1.token));
    await request("POST", "/api/fighters", null, auth(u1.token));
    await request("POST", "/api/fighters", null, auth(u2.token));

    const r1 = await request("GET", "/api/fighters", null, auth(u1.token));
    expect(r1.body.count).toBe(2);

    const r2 = await request("GET", "/api/fighters", null, auth(u2.token));
    expect(r2.body.count).toBe(1);
  });

  it("GET /api/fighters/search — excludes own fighters, no attrs", async () => {
    const u1 = await asUser("f5");
    const u2 = await asUser("f6");
    await request("POST", "/api/camp", { name: "A" }, auth(u1.token));
    await request("POST", "/api/camp", { name: "B" }, auth(u2.token));
    await request("POST", "/api/fighters", null, auth(u1.token));
    await request("POST", "/api/fighters", null, auth(u2.token));

    const res = await request("GET", "/api/fighters/search", null, auth(u1.token));
    expect(res.body.count).toBe(1); // only u2's fighter
    expect(res.body.fighters[0].attrs).toBeUndefined();
    expect(res.body.fighters[0].id).toBeTruthy();
    expect(res.body.fighters[0].name).toBeTruthy();
  });
});

// ── FIGHTS ────────────────────────────────────────────────────
describe("Fights", () => {
  async function twoUsersAndFighters() {
    const u1 = await asUser("x1");
    const u2 = await asUser("x2");
    await request("POST", "/api/camp", { name: "A" }, auth(u1.token));
    await request("POST", "/api/camp", { name: "B" }, auth(u2.token));
    const f1 = await request("POST", "/api/fighters", null, auth(u1.token));
    const f2 = await request("POST", "/api/fighters", null, auth(u2.token));
    const f3 = await request("POST", "/api/fighters", null, auth(u1.token)); // same camp
    const f1Id = f1.body.fighter.id, f2Id = f2.body.fighter.id, f3Id = f3.body.fighter.id;
    // Force matching weight class for all generated fighters
    await pool.query("UPDATE fighters SET weight_class = 'Middleweight' WHERE id IN ($1, $2, $3)", [f1Id, f2Id, f3Id]);
    return {
      u1, u2,
      f1Id, f2Id, f3Id,
    };
  }

  it("POST /api/fights/book — PvP → is_pvp=true", async () => {
    const ctx = await twoUsersAndFighters();
    const res = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    expect(res.status).toBe(201);
    expect(res.body.fight.is_pvp).toBe(true);
    expect(res.body.fight.status).toBe("pending");
  });

  it("POST /api/fights/book — same camp → is_pvp=false", async () => {
    const ctx = await twoUsersAndFighters();
    const res = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f3Id,
    }, auth(ctx.u1.token));
    expect(res.status).toBe(201);
    expect(res.body.fight.is_pvp).toBe(false);
  });

  it("POST /api/fights/book — weight mismatch → 400", async () => {
    const ctx = await twoUsersAndFighters();
    // Force different weight classes via DB update
    await pool.query("UPDATE fighters SET weight_class = 'Flyweight' WHERE id = $1", [ctx.f1Id]);
    await pool.query("UPDATE fighters SET weight_class = 'Heavyweight' WHERE id = $1", [ctx.f2Id]);
    const res = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weight class/i);
  });

  it("PUT /api/fights/:id/gameplan — sets correct side", async () => {
    const ctx = await twoUsersAndFighters();
    const book = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    const fid = book.body.fight.id;

    // User 1 (owner of fighter A) sets plan_a
    const gp1 = await request("PUT", `/api/fights/${fid}/gameplan`, {
      plan: "Balanced", cornerChoice: "go",
    }, auth(ctx.u1.token));
    expect(gp1.body.fight.plan_a).toBe("Balanced");
    expect(gp1.body.fight.plan_b).toBeNull();

    // User 2 (owner of fighter B) sets plan_b
    const gp2 = await request("PUT", `/api/fights/${fid}/gameplan`, {
      plan: "Counter", cornerChoice: "go",
    }, auth(ctx.u2.token));
    expect(gp2.body.fight.plan_a).toBe("Balanced");
    expect(gp2.body.fight.plan_b).toBe("Counter");
  });

  it("PUT /api/fights/:id/gameplan — non-owner → 403", async () => {
    const ctx = await twoUsersAndFighters();
    const u3 = await asUser("y1");
    await request("POST", "/api/camp", { name: "C" }, auth(u3.token));
    const book = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    const res = await request("PUT", `/api/fights/${book.body.fight.id}/gameplan`, {
      plan: "X", cornerChoice: "go",
    }, auth(u3.token));
    expect(res.status).toBe(403);
  });

  it("POST /api/fights/:id/resolve — requires both gameplans", async () => {
    const ctx = await twoUsersAndFighters();
    const book = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    const res = await request("POST", `/api/fights/${book.body.fight.id}/resolve`, null, auth(ctx.u1.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gameplans/);
  });

  it("POST /api/fights/:id/resolve — already resolved → 409", async () => {
    const ctx = await twoUsersAndFighters();
    const book = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    const fid = book.body.fight.id;
    // Submit both gameplans
    await request("PUT", `/api/fights/${fid}/gameplan`, { plan: "Balanced", cornerChoice: "go" }, auth(ctx.u1.token));
    await request("PUT", `/api/fights/${fid}/gameplan`, { plan: "Counter", cornerChoice: "go" }, auth(ctx.u2.token));
    // Resolve once
    await request("POST", `/api/fights/${fid}/resolve`, null, auth(ctx.u1.token));
    // Try again
    const res = await request("POST", `/api/fights/${fid}/resolve`, null, auth(ctx.u1.token));
    expect(res.status).toBe(409);
  });

  it("POST /api/fights/:id/resolve — updates fighter records", async () => {
    const ctx = await twoUsersAndFighters();
    // Force same weight class
    await pool.query("UPDATE fighters SET weight_class = 'Middleweight' WHERE id IN ($1, $2)", [ctx.f1Id, ctx.f2Id]);
    const book = await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));
    const fid = book.body.fight.id;
    await request("PUT", `/api/fights/${fid}/gameplan`, { plan: "Balanced", cornerChoice: "go" }, auth(ctx.u1.token));
    await request("PUT", `/api/fights/${fid}/gameplan`, { plan: "Counter", cornerChoice: "go" }, auth(ctx.u2.token));
    const res = await request("POST", `/api/fights/${fid}/resolve`, null, auth(ctx.u1.token));
    expect(res.status).toBe(200);
    expect(res.body.fight.status).toBe("resolved");
    expect(res.body.fight.winner_id).toBeTruthy();

    // Check records are updated
    const wId = res.body.fight.winner_id;
    const winnerRec = await pool.query("SELECT record FROM fighters WHERE id = $1", [wId]);
    const loserId = wId === ctx.f1Id ? ctx.f2Id : ctx.f1Id;
    const loserRec = await pool.query("SELECT record FROM fighters WHERE id = $1", [loserId]);
    expect(winnerRec.rows[0].record.w).toBe(1);
    expect(loserRec.rows[0].record.l).toBe(1);
  });

  it("GET /api/fights — list with correct count + status filter", async () => {
    const ctx = await twoUsersAndFighters();
    await request("POST", "/api/fights/book", {
      fighterAId: ctx.f1Id, fighterBId: ctx.f2Id,
    }, auth(ctx.u1.token));

    const all = await request("GET", "/api/fights", null, auth(ctx.u1.token));
    expect(all.body.count).toBe(1);

    const pending = await request("GET", "/api/fights?status=pending", null, auth(ctx.u1.token));
    expect(pending.body.count).toBe(1);

    const resolved = await request("GET", "/api/fights?status=resolved", null, auth(ctx.u1.token));
    expect(resolved.body.count).toBe(0);
  });
});
