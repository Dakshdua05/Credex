# Prompts

## Production Summary Prompt

```text
Write a specific, plain-English, 90-110 word AI spend audit summary for this JSON. Be honest if savings are low. Mention Credex only if monthly savings exceed $500. JSON: {{audit_json}}
```

## Why This Prompt

The audit math is deliberately not delegated to an LLM. The prompt receives already-computed totals, per-tool actions, and reasons, then turns them into a short narrative that a founder or engineering manager can read quickly. It asks for plain English, a strict word range, and honesty on low savings so the model does not inflate weak opportunities.

## Failure Handling

If `ANTHROPIC_API_KEY` is missing, the API call times out, or Anthropic returns an error, the app falls back to `buildFallbackSummary()` in `src/audit-engine.js`. That fallback uses the highest-savings item and the audit status to produce a deterministic summary.

## What Did Not Work

A broader prompt that asked the LLM to "find savings" produced recommendations that were difficult to trace to official pricing pages. I narrowed the LLM's job to summary writing only, because finance-facing recommendations need deterministic math and citations.
