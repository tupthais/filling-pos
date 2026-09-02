# Brand Compliance

Brand Compliance Engine v1 is rule-based.

Checks:

- Text against forbidden words and banned phrases.
- Text against tone metadata at a basic phrase level.
- Color metadata against active CI colors.
- Font metadata against forbidden font rules.
- Logo metadata against active logo asset id.

Result statuses:

- `pass`: no issues found.
- `warning`: off-brand metadata or soft issue found.
- `fail`: hard forbidden rule matched.

Publish gate:

- `fail` blocks publish.
- `warning` requires human review before external action in later phases.
- Phase 1 has no real publish capability.

Evidence:

- Matched rules.
- Checked colors.
- Checked fonts.
- Reasons array for audit and user review.

Limitations:

- No image pixel inspection yet.
- No full typography rendering check yet.
- No semantic tone classifier yet.
