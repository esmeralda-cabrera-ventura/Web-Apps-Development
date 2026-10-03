/**
 * Timer: keep a small customer record that outlives the jobs.
 *
 * Jobs are deleted after 90 days, which would otherwise mean a customer who
 * booked four months ago looks like a stranger. This folds each closed job into
 * a tiny aggregate — visit count, first and last visit, lifetime spend — so
 * repeat customers stay recognisable without anyone creating an account.
 *
 * Deliberately minimal: no addresses, no notes, no photos. A few hundred bytes
 * each, and enough to power repeat-customer pricing or a returning-client offer.
 */
const { app } = require("@azure/functions");
const cosmos = require("../shared/cosmos");

app.timer("rollUpCustomers", {
  schedule: process.env.ROLLUP_CRON || "0 30 2 * * *",
  handler: async (_timer, context) => {
    const jobs = await cosmos.listJobs();
    const closed = jobs.filter((j) => j.status === "done" && !j.rolledUp);
    if (!closed.length) {
      context.log("No newly closed jobs to roll up.");
      return;
    }

    let touched = 0;
    for (const j of closed) {
      const key = cosmos.contactKey(j);
      if (key === "e" || key === "p") continue; // no usable contact detail

      const existing = (await cosmos.readCustomer(key)) || {
        id: key, contactKey: key, type: "customer",
        visits: 0, totalCents: 0, firstVisit: null, lastVisit: null,
        cities: [], recurring: false
      };

      const day = (j.confirmedSlot && j.confirmedSlot.date) ||
                  (j.completedAt || "").slice(0, 10) || null;
      const city = (j.address && j.address.city) || null;

      existing.name = j.name || existing.name;
      existing.lang = j.lang || existing.lang;
      existing.visits += 1;
      existing.totalCents += j.estimateCents || 0;
      if (day) {
        if (!existing.firstVisit || day < existing.firstVisit) existing.firstVisit = day;
        if (!existing.lastVisit || day > existing.lastVisit) existing.lastVisit = day;
      }
      if (city && !existing.cities.includes(city)) existing.cities.push(city);
      if (j.frequency && j.frequency !== "once") existing.recurring = true;
      existing.updatedAt = new Date().toISOString();

      await cosmos.upsertCustomer(existing);
      await cosmos.upsertJob({ ...j, rolledUp: true });
      touched++;
    }

    context.log(`Rolled up ${touched} closed job(s) into customer records.`);
  }
});
