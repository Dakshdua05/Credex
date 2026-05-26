# Tests

Run all tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Automated tests:

- `tests/audit-engine.test.js` - downgrades Claude Team for teams too small to justify Team.
- `tests/audit-engine.test.js` - does not manufacture savings when spend already matches plan price.
- `tests/audit-engine.test.js` - catches entered spend above official plan-price expectations.
- `tests/audit-engine.test.js` - optimizes API-heavy data workloads with batch and cheaper model routing.
- `tests/audit-engine.test.js` - marks high-savings audits as Credex-ready.
- `tests/audit-engine.test.js` - sanitizes unknown tools and invalid numbers.
- `tests/audit-engine.test.js` - produces an honest fallback summary for healthy spend.
- `tests/audit-engine.test.js` - compares spend per team member in benchmark mode.
- `tests/audit-engine.test.js` - generates stable referral codes.
