import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { runAudit, buildFallbackSummary, makeReferralCode, sanitizeAuditInput } from "./audit-engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const port = Number(process.env.PORT) || 4173;
const rateLimit = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "POST" && url.pathname === "/api/audits") return handleAudit(req, res);
    if (req.method === "POST" && url.pathname === "/api/leads") return handleLead(req, res);
    if (req.method === "GET" && url.pathname.startsWith("/audit/")) return handlePublicAudit(url, res);
    return serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unexpected server error" });
  }
});

server.listen(port, () => {
  console.log(`StackLens running at http://localhost:${port}`);
});

async function handleAudit(req, res) {
  if (!allowRequest(req, "audit", 20)) return sendJson(res, 429, { error: "Too many audit requests. Please wait a minute." });
  const body = await readBody(req);
  const input = sanitizeAuditInput(body.input || {});
  const audit = runAudit(input);
  const summary = await generateSummary(audit);
  const id = crypto.randomBytes(8).toString("hex");
  const referralCode = makeReferralCode(id);
  const record = {
    id,
    referralCode,
    referredBy: sanitizeReferral(body.referralCode || body.ref || ""),
    createdAt: new Date().toISOString(),
    input,
    audit,
    summary
  };
  await appendJson("audits.json", record);
  sendJson(res, 201, {
    id,
    publicUrl: `/audit/${id}`,
    referralCode,
    referralUrl: `/audit/${id}?ref=${encodeURIComponent(referralCode)}`,
    audit,
    summary
  });
}

async function handleLead(req, res) {
  if (!allowRequest(req, "lead", 8)) return sendJson(res, 429, { error: "Too many lead requests. Please wait a minute." });
  const body = await readBody(req);
  if (body.website) return sendJson(res, 200, { ok: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || "")) {
    return sendJson(res, 400, { error: "Enter a valid email address." });
  }
  const lead = {
    id: crypto.randomBytes(8).toString("hex"),
    auditId: body.auditId,
    email: body.email,
    company: body.company || "",
    role: body.role || "",
    teamSize: Number(body.teamSize) || null,
    referralCode: sanitizeReferral(body.referralCode || ""),
    createdAt: new Date().toISOString()
  };
  await appendJson("leads.json", lead);
  await sendTransactionalEmail(lead);
  sendJson(res, 201, { ok: true });
}

async function handlePublicAudit(url, res) {
  const id = url.pathname.split("/").pop();
  const records = await readJsonArray("audits.json");
  const record = records.find((item) => item.id === id);
  if (!record) return serveStatic("/index.html", res);
  const baseHtml = await readFile(path.join(root, "index.html"), "utf8");
  const safePayload = JSON.stringify({
    audit: record.audit,
    summary: record.summary,
    referralCode: record.referralCode
  }).replace(/</g, "\\u003c");
  const title = `StackLens found $${record.audit.totalMonthlySavings}/mo in AI savings`;
  const description = `${record.audit.items.length} tools audited for a ${record.audit.teamSize}-person team. Annual opportunity: $${record.audit.totalAnnualSavings}.`;
  const html = baseHtml
    .replace("<title>StackLens - AI Spend Audit</title>", `<title>${escapeHtml(title)}</title>`)
    .replace('content="Audit AI tool spend, find plan waste, and get a shareable savings report in minutes."', `content="${escapeHtml(description)}"`)
    .replace('content="StackLens AI Spend Audit"', `content="${escapeHtml(title)}"`)
    .replace('content="Find AI tool overspend across Cursor, Copilot, Claude, ChatGPT, Gemini, Windsurf, and API usage."', `content="${escapeHtml(description)}"`)
    .replace('<script type="module" src="/src/app.js"></script>', `<script>window.__AUDIT__=${safePayload};</script><script type="module" src="/src/app.js"></script>`);
  send(res, 200, html, "text/html; charset=utf-8");
}

function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(root, decodeURIComponent(safePath));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  const ext = path.extname(filePath);
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(res);
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readJsonArray(fileName) {
  await mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
  if (!existsSync(filePath)) return [];
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function appendJson(fileName, record) {
  const records = await readJsonArray(fileName);
  records.push(record);
  await writeFile(path.join(dataDir, fileName), JSON.stringify(records, null, 2));
}

async function generateSummary(audit) {
  if (!process.env.ANTHROPIC_API_KEY) return buildFallbackSummary(audit);
  const prompt = `Write a specific, plain-English, 90-110 word AI spend audit summary for this JSON. Be honest if savings are low. Mention Credex only if monthly savings exceed $500. JSON: ${JSON.stringify(audit)}`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 180,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) throw new Error(`Anthropic returned ${response.status}`);
    const data = await response.json();
    return data.content?.map((part) => part.text).join("").trim() || buildFallbackSummary(audit);
  } catch {
    return buildFallbackSummary(audit);
  }
}

async function sendTransactionalEmail(lead) {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "StackLens <audit@credex.rocks>",
        to: lead.email,
        subject: "Your StackLens AI spend audit",
        text: `Thanks for using StackLens. Your report is ready at /audit/${lead.auditId}. If the audit shows high savings, Credex may reach out with discounted credit options.`
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

function allowRequest(req, bucket, limit) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateLimit.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rateLimit.set(key, entry);
  return entry.count <= limit;
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function send(res, status, body, type) {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function sanitizeReferral(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}
