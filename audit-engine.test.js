import test from "node:test";
import assert from "node:assert/strict";
import { runAudit, sanitizeAuditInput, buildFallbackSummary, makeReferralCode } from "../src/audit-engine.js";

test("downgrades Claude Team for a tiny team", () => {
  const audit = runAudit({
    teamSize: 2,
    useCase: "writing",
    tools: [{ tool: "claude", plan: "team", seats: 2, monthlySpend: 150 }]
  });
  assert.equal(audit.items[0].recommendedSpend, 40);
  assert.equal(audit.items[0].savings, 110);
  assert.match(audit.items[0].action, /Claude/);
});

test("does not manufacture savings for already reasonable spend", () => {
  const audit = runAudit({
    teamSize: 3,
    useCase: "mixed",
    tools: [{ tool: "chatgpt", plan: "plus", seats: 3, monthlySpend: 60 }]
  });
  assert.equal(audit.totalMonthlySavings, 0);
  assert.equal(audit.status, "healthy");
});

test("catches retail spend above official plan price", () => {
  const audit = runAudit({
    teamSize: 4,
    useCase: "coding",
    tools: [{ tool: "cursor", plan: "pro", seats: 4, monthlySpend: 140 }]
  });
  assert.equal(audit.items[0].recommendedSpend, 80);
  assert.equal(audit.items[0].savings, 60);
  assert.match(audit.items[0].reason, /15%/);
});

test("optimizes API spend more aggressively for data workloads", () => {
  const audit = runAudit({
    teamSize: 6,
    useCase: "data",
    tools: [{ tool: "openaiApi", plan: "direct", seats: 1, monthlySpend: 1000 }]
  });
  assert.equal(audit.items[0].recommendedSpend, 580);
  assert.equal(audit.items[0].savings, 420);
  assert.match(audit.items[0].action, /data workloads/i);
});

test("flags high savings as a Credex-ready audit", () => {
  const audit = runAudit({
    teamSize: 12,
    useCase: "mixed",
    tools: [
      { tool: "anthropicApi", plan: "direct", seats: 1, monthlySpend: 1200 },
      { tool: "copilot", plan: "enterprise", seats: 8, monthlySpend: 500 }
    ]
  });
  assert.equal(audit.status, "high");
  assert.ok(audit.totalMonthlySavings > 500);
});

test("sanitizes unknown tools and invalid numbers", () => {
  const clean = sanitizeAuditInput({
    teamSize: -3,
    tools: [
      { tool: "unknown", plan: "pro", seats: -1, monthlySpend: -10 },
      { tool: "windsurf", plan: "pro", seats: "2", monthlySpend: "40" }
    ]
  });
  assert.equal(clean.teamSize, 1);
  assert.equal(clean.tools.length, 1);
  assert.equal(clean.tools[0].seats, 2);
});

test("fallback summary is honest for healthy audits", () => {
  const audit = runAudit({
    teamSize: 1,
    useCase: "research",
    tools: [{ tool: "gemini", plan: "pro", seats: 1, monthlySpend: 20 }]
  });
  assert.match(buildFallbackSummary(audit), /disciplined|spending well/i);
});

test("benchmark mode compares spend per team member", () => {
  const audit = runAudit({
    teamSize: 5,
    useCase: "coding",
    tools: [{ tool: "cursor", plan: "business", seats: 5, monthlySpend: 1000 }]
  });
  assert.equal(audit.benchmark.perMemberSpend, 200);
  assert.equal(audit.benchmark.status, "above");
  assert.match(audit.benchmark.note, /benchmark/);
});

test("referral codes are stable and shareable", () => {
  assert.equal(makeReferralCode("abc123xyz"), "STACK-ABC123");
  assert.match(makeReferralCode(), /^STACK-[A-Z0-9]{6}$/);
});
