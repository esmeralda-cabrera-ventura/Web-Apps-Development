/**
 * GET /api/health — a plain liveness check.
 *
 * The old version reported whether the database was "starting". Cosmos has no
 * such state, so this simply answers whether the account is reachable.
 */
const { app } = require("@azure/functions");
const { json } = require("../shared/http");
const cosmos = require("../shared/cosmos");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (_request, context) => {
    const started = Date.now();
    let database = "up";
    try {
      await cosmos.ping();
    } catch (err) {
      context.error("Cosmos unreachable:", err.message);
      database = err.code === 403 ? "forbidden" : "error";
    }
    return json(database === "up" ? 200 : 503, {
      api: "up",
      database,
      ms: Date.now() - started,
      time: new Date().toISOString()
    });
  }
});
