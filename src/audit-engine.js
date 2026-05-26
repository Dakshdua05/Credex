import { TOOL_CATALOG, expectedMonthly, getPlan } from "./pricing-data.js";

const CREDIT_DISCOUNT = 0.22;
const BENCHMARKS = {
  coding: 95,
  writing: 42,
  data: 125,
  research: 72,
  mixed: 88
};

function money(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function sameVendorDowngrade(item, teamSize) {
  const seats = Math.max(1, Number(item.seats) || 1);
  const spend = Number(item.monthlySpend) || 0;
  const tool = TOOL_CATALOG[item.tool];
  const plan = getPlan(item.tool, item.plan);
  if (!tool || !plan) return null;

  const smallTeam = Math.max(teamSize || seats, seats) < 5;
  const candidates = [];

  if (item.tool === "claude" && ["team", "enterprise"].includes(item.plan) && smallTeam) {
    candidates.push({ planId: "pro", target: seats * 20, action: "Move Claude seats to Pro until collaboration controls matter" });
  }
  if (item.tool === "chatgpt" && ["team", "enterprise"].includes(item.plan) && seats < 2) {
    candidates.push({ planId: "plus", target: seats * 20, action: "Use ChatGPT Plus for a single-user workflow" });
  }
  if (item.tool === "cursor" && ["business", "enterprise"].includes(item.plan) && seats < 4) {
    candidates.push({ planId: "pro", target: seats * 20, action: "Use Cursor Pro until admin controls justify Business" });
  }
  if (item.tool === "windsurf" && ["teams", "enterprise"].includes(item.plan) && seats < 4) {
    candidates.push({ planId: "pro", target: seats * 20, action: "Use Windsurf Pro for a small individual-heavy team" });
  }
  if (item.tool === "copilot" && item.plan === "enterprise" && seats < 10) {
    candidates.push({ planId: "business", target: seats * 19, action: "Move Copilot Enterprise seats to Business" });
  }
  if (item.tool === "gemini" && item.plan === "ultra" && spend > seats * 100 && seats < 3) {
    candidates.push({ planId: "pro", target: seats * 19.99, action: "Use Gemini Pro unless Ultra limits are consistently exhausted" });
  }

  return bestCandidate(spend, candidates, (candidate) => {
    const targetPlan = tool.plans[candidate.planId];
    return `${targetPlan.label} covers this team shape at about $${Math.round(candidate.target)}/mo; ${plan.label} only pays back when the missing admin, compliance, or usage limit is required.`;
  });
}

function listPriceCorrection(item) {
  const spend = Number(item.monthlySpend) || 0;
  const expected = expectedMonthly(item.tool, item.plan, item.seats);
  if (expected === null || expected <= 0) return null;
  if (spend <= expected * 1.15) return null;
  const tool = TOOL_CATALOG[item.tool];
  const plan = getPlan(item.tool, item.plan);
  return {
    currentSpend: money(spend),
    recommendedSpend: money(expected),
    savings: money(spend - expected),
    action: `Reconcile ${tool.label} ${plan.label} billing to public list price`,
    reason: `The entered spend is more than 15% above the cited public plan price for ${item.seats || 1} seat(s), so the first win is removing duplicate seats, add-ons, or stale invoices.`
  };
}

function codingAlternative(item, useCase) {
  const seats = Math.max(1, Number(item.seats) || 1);
  const spend = Number(item.monthlySpend) || 0;
  if (!["coding", "mixed"].includes(useCase)) return null;
  if (!["cursor", "windsurf", "copilot"].includes(item.tool)) return null;
  if (!["business", "teams", "enterprise", "max"].includes(item.plan)) return null;

  const alternatives = [];
  if (item.tool !== "copilot") {
    alternatives.push({
      target: seats * 19,
      action: "Benchmark GitHub Copilot Business for lighter coding seats",
      reason: "For developers who mainly need IDE chat, inline completions, and policy controls, Copilot Business is materially cheaper per seat than premium agentic IDE plans."
    });
  }
  if (item.tool !== "cursor" && spend > seats * 40) {
    alternatives.push({
      target: seats * 40,
      action: "Move heavy agentic users to Cursor Business and keep light users cheaper",
      reason: "Cursor Business is a defensible ceiling for agentic coding seats; spend above that should map to actual heavy usage, not every engineer by default."
    });
  }

  return bestCandidate(spend, alternatives);
}

function apiOptimization(item, useCase) {
  const spend = Number(item.monthlySpend) || 0;
  if (spend < 100) return null;
  const apiTools = ["anthropicApi", "openaiApi"];
  if ((item.tool === "claude" || item.tool === "chatgpt" || item.tool === "gemini") && item.plan !== "api") return null;
  if (!apiTools.includes(item.tool) && item.plan !== "api") return null;

  let multiplier = 0.72;
  let action = "Apply caching, batch jobs, and cheaper default models";
  let reason = "API spend above $100/mo usually has avoidable waste: cached context, batchable jobs, and routing routine calls to mini or flash models before escalating.";

  if (useCase === "data") {
    multiplier = 0.58;
    action = "Route data workloads through batch and low-cost models first";
    reason = "Data extraction and classification are high-volume, low-novelty workloads; batch processing and cheaper models typically preserve quality while cutting token cost.";
  }
  if (useCase === "research") {
    multiplier = 0.8;
    reason = "Research workloads need quality headroom, so the safer savings move is caching repeated context and batching background analysis rather than forcing every call to the cheapest model.";
  }

  return {
    currentSpend: money(spend),
    recommendedSpend: money(spend * multiplier),
    savings: money(spend * (1 - multiplier)),
    action,
    reason
  };
}

function creditOpportunity(item) {
  const spend = Number(item.monthlySpend) || 0;
  const highIntentPlans = ["business", "enterprise", "team", "teams", "api", "direct", "ultra", "max"];
  if (spend < 500 || !highIntentPlans.includes(item.plan)) return null;
  return {
    currentSpend: money(spend),
    recommendedSpend: money(spend * (1 - CREDIT_DISCOUNT)),
    savings: money(spend * CREDIT_DISCOUNT),
    action: "Source equivalent AI credits through Credex",
    reason: "At this spend level, the tool is probably real production usage; discounted credits can reduce retail outlay without forcing an immediate workflow migration."
  };
}

function bestCandidate(spend, candidates, reasonFactory) {
  const viable = candidates
    .map((candidate) => ({
      currentSpend: money(spend),
      recommendedSpend: money(candidate.target),
      savings: money(spend - candidate.target),
      action: candidate.action,
      reason: reasonFactory ? reasonFactory(candidate) : candidate.reason
    }))
    .filter((candidate) => candidate.savings >= 10)
    .sort((a, b) => b.savings - a.savings);
  return viable[0] || null;
}

function chooseRecommendation(item, useCase, teamSize) {
  const checks = [
    sameVendorDowngrade(item, teamSize),
    listPriceCorrection(item),
    codingAlternative(item, useCase),
    apiOptimization(item, useCase),
    creditOpportunity(item)
  ].filter(Boolean);

  if (checks.length === 0) {
    const spend = Number(item.monthlySpend) || 0;
    return {
      currentSpend: money(spend),
      recommendedSpend: money(spend),
      savings: 0,
      action: "Keep as-is",
      reason: "The plan and entered spend look reasonable for the stated team size and use case."
    };
  }

  return checks.sort((a, b) => b.savings - a.savings)[0];
}

export function sanitizeAuditInput(input) {
  const tools = Array.isArray(input.tools) ? input.tools : [];
  return {
    teamSize: Math.max(1, Number(input.teamSize) || 1),
    useCase: input.useCase || "mixed",
    tools: tools
      .filter((item) => TOOL_CATALOG[item.tool] && getPlan(item.tool, item.plan))
      .map((item) => ({
        tool: item.tool,
        plan: item.plan,
        seats: Math.max(1, Number(item.seats) || 1),
        monthlySpend: Math.max(0, Number(item.monthlySpend) || 0)
      }))
  };
}

export function runAudit(input) {
  const clean = sanitizeAuditInput(input);
  const items = clean.tools.map((item) => {
    const tool = TOOL_CATALOG[item.tool];
    const plan = getPlan(item.tool, item.plan);
    const recommendation = chooseRecommendation(item, clean.useCase, clean.teamSize);
    return {
      toolId: item.tool,
      toolName: tool.label,
      planId: item.plan,
      planName: plan.label,
      seats: item.seats,
      currentSpend: recommendation.currentSpend,
      recommendedSpend: recommendation.recommendedSpend,
      savings: recommendation.savings,
      action: recommendation.action,
      reason: recommendation.reason,
      sourceUrl: tool.officialUrl
    };
  });

  const totalCurrent = items.reduce((sum, item) => sum + item.currentSpend, 0);
  const totalMonthlySavings = items.reduce((sum, item) => sum + item.savings, 0);
  const savingsRate = totalCurrent ? totalMonthlySavings / totalCurrent : 0;
  const benchmark = buildBenchmark(clean, totalCurrent);

  return {
    teamSize: clean.teamSize,
    useCase: clean.useCase,
    totalCurrent,
    totalMonthlySavings,
    totalAnnualSavings: totalMonthlySavings * 12,
    savingsRate,
    benchmark,
    status: totalMonthlySavings > 500 ? "high" : totalMonthlySavings < 100 ? "healthy" : "moderate",
    items
  };
}

export function buildBenchmark(input, totalCurrent) {
  const clean = sanitizeAuditInput(input);
  const base = BENCHMARKS[clean.useCase] || BENCHMARKS.mixed;
  const sizeMultiplier = clean.teamSize <= 5 ? 1.18 : clean.teamSize >= 25 ? 0.86 : 1;
  const peerAverage = money(base * sizeMultiplier);
  const perMemberSpend = money(totalCurrent / clean.teamSize);
  const delta = money(perMemberSpend - peerAverage);
  const status = delta > peerAverage * 0.25 ? "above" : delta < -peerAverage * 0.2 ? "below" : "aligned";
  const note = status === "above"
    ? `Your AI spend per team member is about $${delta}/mo above the benchmark for similar ${clean.useCase} teams.`
    : status === "below"
      ? "Your AI spend per team member is below the benchmark; focus on quality and adoption before cutting more."
      : "Your AI spend per team member is close to the benchmark; prioritize plan fit over broad cuts.";
  return {
    perMemberSpend,
    peerAverage,
    delta,
    status,
    note
  };
}

export function makeReferralCode(seed = "") {
  const source = String(seed || Date.now()).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const compact = source.padEnd(6, "X").slice(0, 6);
  return `STACK-${compact}`;
}

export function buildFallbackSummary(audit) {
  const largest = [...audit.items].sort((a, b) => b.savings - a.savings)[0];
  if (!largest || audit.totalMonthlySavings < 100) {
    return `Your AI stack looks disciplined for a ${audit.teamSize}-person team. The entered plans are mostly aligned with current usage, so the best next move is monitoring price changes and new credit opportunities rather than forcing a switch that creates workflow churn.`;
  }
  const credexLine = audit.totalMonthlySavings > 500
    ? " Because the savings opportunity is above $500 per month, discounted AI credits are worth discussing before you renegotiate retail contracts."
    : "";
  return `Your biggest savings lever is ${largest.toolName}: ${largest.action.toLowerCase()}, worth about $${largest.savings}/mo. Across the stack, StackLens found roughly $${audit.totalMonthlySavings}/mo and $${audit.totalAnnualSavings}/yr in defensible savings without assuming lower usage. Prioritize changes that preserve the team's primary ${audit.useCase} workflow before chasing every small optimization.${credexLine}`;
}
