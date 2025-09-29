# Tailwind Utility Audit

Run the audit script to get an up-to-date inventory of Tailwind-style utility
classes that remain in templates.

```bash
python3 scripts/audit_tailwind.py --output reports/tailwind-audit.csv
# or via npm
npm run audit:tailwind
```

Add `--fail-on-violation` when you want the command to exit non-zero if any
utilities remain (useful in CI pipelines).

The CSV columns are:

| Column      | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `file`      | File path relative to the repository root.                       |
| `total`     | Total matches for Tailwind-style tokens in that file.            |
| `unique`    | Number of unique utility tokens found.                           |
| `top_samples` | Up to five most frequent tokens (space-separated).             |

Use `--top N` to change the number of sample tokens, and pass a custom path to
limit the scan (defaults to `src`). Example:

```bash
python3 scripts/audit_tailwind.py --top 10 src/app/components/pages --output reports/tailwind-pages.csv
# or enforce in CI with
npm run lint:tailwind
```

The scanner only inspects class attribute values (`class=`, `[ngClass]`, etc.),
so CSS property definitions or OpenAI design tokens do not produce false
positives. This lets you focus remediation efforts on templates still using
utility classes.
