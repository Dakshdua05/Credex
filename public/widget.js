(function () {
  const script = document.currentScript;
  const mount = document.createElement("section");
  const baseUrl = new URL(script.src).origin;
  mount.innerHTML = `
    <style>
      .stacklens-widget{font-family:Inter,system-ui,sans-serif;border:1px solid #d8dee9;border-radius:8px;padding:16px;max-width:420px;background:#fff;color:#111827}
      .stacklens-widget h3{margin:0 0 8px;font-size:1.25rem}
      .stacklens-widget p{margin:0 0 12px;color:#5b6678;line-height:1.45}
      .stacklens-widget label{display:grid;gap:6px;margin:10px 0;font-size:.82rem;font-weight:800;color:#5b6678}
      .stacklens-widget input,.stacklens-widget select{min-height:40px;border:1px solid #d8dee9;border-radius:8px;padding:0 10px;font:inherit}
      .stacklens-widget strong{display:block;margin:12px 0 4px;font-size:1.6rem;color:#0f766e}
      .stacklens-widget a{display:inline-flex;align-items:center;min-height:40px;margin-top:8px;padding:0 12px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none;font-weight:800}
    </style>
    <div class="stacklens-widget">
      <h3>AI spend benchmark</h3>
      <p>Estimate whether your team is above or below peer AI spend before running a full StackLens audit.</p>
      <label>Team size <input data-sl-team type="number" min="1" value="8"></label>
      <label>Monthly AI spend <input data-sl-spend type="number" min="0" value="900"></label>
      <label>Use case
        <select data-sl-use>
          <option value="coding">Coding</option>
          <option value="writing">Writing</option>
          <option value="data">Data</option>
          <option value="research">Research</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>
      <strong data-sl-result>$113/member/mo</strong>
      <p data-sl-note>Similar teams average about $95/member/mo.</p>
      <a href="${baseUrl}/#audit-form" target="_blank" rel="noreferrer">Run full audit</a>
    </div>
  `;
  script.insertAdjacentElement("afterend", mount);

  const benchmarks = { coding: 95, writing: 42, data: 125, research: 72, mixed: 88 };
  const team = mount.querySelector("[data-sl-team]");
  const spend = mount.querySelector("[data-sl-spend]");
  const use = mount.querySelector("[data-sl-use]");
  const result = mount.querySelector("[data-sl-result]");
  const note = mount.querySelector("[data-sl-note]");

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
  }

  function update() {
    const teamSize = Math.max(1, Number(team.value) || 1);
    const perMember = Math.round((Number(spend.value) || 0) / teamSize);
    const average = benchmarks[use.value] || benchmarks.mixed;
    const direction = perMember > average * 1.25 ? "above" : perMember < average * 0.8 ? "below" : "near";
    result.textContent = `${money(perMember)}/member/mo`;
    note.textContent = `Similar teams average about ${money(average)}/member/mo. Your spend is ${direction} the benchmark.`;
  }

  mount.addEventListener("input", update);
  update();
}());
