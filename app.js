import { runAudit, buildFallbackSummary } from "./audit-engine.js";
import { TOOL_CATALOG, USE_CASES } from "./pricing-data.js";

const STORAGE_KEY = "stacklens.form.v1";
const app = document.querySelector("#app");

const defaultState = {
  teamSize: 8,
  useCase: "coding",
  tools: [
    { tool: "cursor", plan: "business", monthlySpend: 320, seats: 8 },
    { tool: "chatgpt", plan: "team", monthlySpend: 240, seats: 8 },
    { tool: "anthropicApi", plan: "direct", monthlySpend: 650, seats: 1 }
  ]
};

let state = loadState();
let audit = window.__AUDIT__?.audit || runAudit(state);
let summary = window.__AUDIT__?.summary || buildFallbackSummary(audit);
let reportUrl = window.location.pathname.startsWith("/audit/") ? window.location.pathname : "";
let referralCode = window.__AUDIT__?.referralCode || new URLSearchParams(window.location.search).get("ref") || "";

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.tools?.length) return saved;
  } catch {
    // Ignore corrupted local form state.
  }
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function render() {
  audit = window.__AUDIT__?.audit || runAudit(state);
  app.innerHTML = `
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">StackLens by Credex</p>
          <h1>Stop overpaying for AI tools.</h1>
          <p class="subhead">Enter your stack, get a finance-literate audit, and share a clean savings report without creating an account.</p>
          <div class="hero-actions">
            <a class="button primary" href="#audit-form">Audit spend</a>
            <a class="button secondary" href="#results">View report</a>
          </div>
        </div>
        <div class="hero-metrics" aria-label="Current audit summary">
          <span>Potential savings</span>
          <strong>${currency(audit.totalMonthlySavings)}/mo</strong>
          <small>${currency(audit.totalAnnualSavings)} annually</small>
        </div>
      </section>

      <section class="workspace" id="audit-form">
        <form class="panel input-panel" id="spend-form">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Input</p>
              <h2>AI stack</h2>
            </div>
            <button type="button" class="icon-button" id="add-tool" title="Add tool" aria-label="Add tool">+</button>
          </div>
          <div class="meta-grid">
            <label>Team size
              <input name="teamSize" type="number" min="1" value="${state.teamSize}">
            </label>
            <label>Primary use case
              <select name="useCase">
                ${Object.entries(USE_CASES).map(([key, label]) => `<option value="${key}" ${state.useCase === key ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="tool-list">
            ${state.tools.map((item, index) => renderToolRow(item, index)).join("")}
          </div>
        </form>

        <section class="panel results-panel" id="results">
          ${renderResults()}
        </section>
      </section>
    </main>
  `;

  bindEvents();
}

function renderToolRow(item, index) {
  const tool = TOOL_CATALOG[item.tool] || TOOL_CATALOG.cursor;
  return `
    <div class="tool-row" data-index="${index}">
      <label>Tool
        <select name="tool">
          ${Object.entries(TOOL_CATALOG).map(([id, data]) => `<option value="${id}" ${item.tool === id ? "selected" : ""}>${data.label}</option>`).join("")}
        </select>
      </label>
      <label>Plan
        <select name="plan">
          ${Object.entries(tool.plans).map(([id, plan]) => `<option value="${id}" ${item.plan === id ? "selected" : ""}>${plan.label}</option>`).join("")}
        </select>
      </label>
      <label>Monthly spend
        <input name="monthlySpend" type="number" min="0" step="1" value="${item.monthlySpend}">
      </label>
      <label>Seats
        <input name="seats" type="number" min="1" step="1" value="${item.seats}">
      </label>
      <button type="button" class="icon-button remove-tool" title="Remove tool" aria-label="Remove tool">x</button>
    </div>
  `;
}

function renderResults() {
  const cta = audit.status === "high"
    ? `<div class="credex-callout"><strong>Credex fit detected</strong><span>This audit shows enough savings to justify a credits consultation.</span><a class="button primary" href="https://credex.rocks" target="_blank" rel="noreferrer">Book Credex consult</a></div>`
    : audit.status === "healthy"
      ? `<div class="healthy-callout"><strong>You are spending well.</strong><span>Leave an email and StackLens will notify you when a new optimization applies to your stack.</span></div>`
      : `<div class="healthy-callout"><strong>Useful savings found.</strong><span>Start with the largest item, then revisit the stack after one billing cycle.</span></div>`;

  return `
    <div class="section-heading">
      <div>
        <p class="eyebrow">Audit</p>
        <h2>${currency(audit.totalMonthlySavings)}/mo savings</h2>
      </div>
      <span class="annual">${currency(audit.totalAnnualSavings)}/yr</span>
    </div>
    <p class="summary">${summary}</p>
    ${renderBenchmark()}
    ${cta}
    <div class="breakdown">
      ${audit.items.map((item) => `
        <article class="result-item">
          <div>
            <h3>${item.toolName}</h3>
            <p>${item.planName} - ${item.seats} seat(s)</p>
          </div>
          <div class="spend-path">
            <span>${currency(item.currentSpend)}</span>
            <span aria-hidden="true">-&gt;</span>
            <span>${currency(item.recommendedSpend)}</span>
          </div>
          <strong>${currency(item.savings)}/mo</strong>
          <p>${item.action}. ${item.reason}</p>
        </article>
      `).join("")}
    </div>
    <form class="lead-form" id="lead-form">
      <input class="hidden-field" name="website" tabindex="-1" autocomplete="off">
      <label>Email
        <input required name="email" type="email" placeholder="founder@company.com">
      </label>
      <label>Company
        <input name="company" type="text" placeholder="Acme AI">
      </label>
      <label>Role
        <input name="role" type="text" placeholder="Founder">
      </label>
      <button class="button primary" type="submit">Capture report</button>
      <button class="button secondary" id="share-report" type="button">Create share URL</button>
      <button class="button secondary" id="export-pdf" type="button">Export PDF</button>
      <p class="form-status" id="form-status"></p>
    </form>
    <div class="bonus-grid">
      ${renderReferral()}
      ${renderEmbed()}
    </div>
  `;
}

function renderBenchmark() {
  const benchmark = audit.benchmark;
  if (!benchmark) return "";
  return `
    <section class="benchmark-panel">
      <div>
        <p class="eyebrow">Benchmark mode</p>
        <h3>${currency(benchmark.perMemberSpend)}/member/mo</h3>
        <p>Similar ${audit.useCase} teams average ${currency(benchmark.peerAverage)}/member/mo.</p>
      </div>
      <span class="benchmark-badge ${benchmark.status}">${benchmark.status}</span>
      <p>${benchmark.note}</p>
    </section>
  `;
}

function renderReferral() {
  const code = referralCode || "Create a share URL first";
  const url = reportUrl && referralCode ? `${reportUrl}?ref=${encodeURIComponent(referralCode)}` : "Create a share URL to unlock referral tracking.";
  return `
    <section class="bonus-panel">
      <p class="eyebrow">Referral</p>
      <h3>${code}</h3>
      <p>Share this report. If both teams book a Credex consult, both get priority credit-market alerts.</p>
      <code>${url}</code>
    </section>
  `;
}

function renderEmbed() {
  const origin = window.location.origin;
  const snippet = `<script src="${origin}/public/widget.js" data-stacklens-widget></script>`;
  return `
    <section class="bonus-panel">
      <p class="eyebrow">Embeddable widget</p>
      <h3>Drop-in calculator</h3>
      <p>Bloggers can paste this script to embed a compact AI spend benchmark.</p>
      <code>${escapeHtml(snippet)}</code>
    </section>
  `;
}

function bindEvents() {
  document.querySelector("#spend-form").addEventListener("input", (event) => {
    const field = event.target;
    if (field.name === "teamSize") state.teamSize = Number(field.value);
    if (field.name === "useCase") state.useCase = field.value;
    const row = field.closest(".tool-row");
    if (row) {
      const index = Number(row.dataset.index);
      state.tools[index][field.name] = ["seats", "monthlySpend"].includes(field.name) ? Number(field.value) : field.value;
      if (field.name === "tool") {
        state.tools[index].plan = Object.keys(TOOL_CATALOG[field.value].plans)[0];
      }
    }
    window.__AUDIT__ = null;
    summary = buildFallbackSummary(runAudit(state));
    saveState();
    render();
  });

  document.querySelector("#add-tool").addEventListener("click", () => {
    state.tools.push({ tool: "cursor", plan: "pro", monthlySpend: 20, seats: 1 });
    saveState();
    render();
  });

  document.querySelectorAll(".remove-tool").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.target.closest(".tool-row").dataset.index);
      state.tools.splice(index, 1);
      if (state.tools.length === 0) state.tools.push({ tool: "cursor", plan: "pro", monthlySpend: 20, seats: 1 });
      saveState();
      render();
    });
  });

  document.querySelector("#share-report").addEventListener("click", createShareUrl);
  document.querySelector("#export-pdf").addEventListener("click", exportPdf);
  document.querySelector("#lead-form").addEventListener("submit", captureLead);
}

async function createShareUrl() {
  const status = document.querySelector("#form-status");
  status.textContent = "Creating share URL...";
  try {
    const response = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: state, referralCode })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not create report.");
    summary = result.summary || summary;
    reportUrl = result.publicUrl;
    referralCode = result.referralCode || referralCode;
    const message = `Public URL: <a href="${result.publicUrl}">${result.publicUrl}</a> | Referral URL: <a href="${result.referralUrl}">${result.referralUrl}</a>`;
    render();
    document.querySelector("#form-status").innerHTML = message;
  } catch (error) {
    status.textContent = `${error.message} The on-screen report still works locally.`;
  }
}

async function exportPdf() {
  if (!reportUrl) {
    await createShareUrl();
  }
  document.body.classList.add("print-report");
  window.print();
  setTimeout(() => document.body.classList.remove("print-report"), 500);
}

async function captureLead(event) {
  event.preventDefault();
  const status = document.querySelector("#form-status");
  const form = new FormData(event.target);
  status.textContent = "Saving report...";
  try {
    const auditResponse = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: state })
    });
    const auditResult = await auditResponse.json();
    if (!auditResponse.ok) throw new Error(auditResult.error || "Could not save audit.");

    const leadResponse = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        auditId: auditResult.id,
        email: form.get("email"),
        company: form.get("company"),
        role: form.get("role"),
        teamSize: state.teamSize,
        referralCode,
        website: form.get("website")
      })
    });
    const leadResult = await leadResponse.json();
    if (!leadResponse.ok) throw new Error(leadResult.error || "Could not save lead.");
    reportUrl = auditResult.publicUrl;
    referralCode = auditResult.referralCode || referralCode;
    status.innerHTML = `Saved. Public URL: <a href="${auditResult.publicUrl}">${auditResult.publicUrl}</a>`;
  } catch (error) {
    status.textContent = error.message;
  }
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
