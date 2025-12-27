# Archived Change Note

- Change ID: add-dynamic-customers-contacts
- Archived: 2025-12-27 (manual archive)
- Reason: `openspec` CLI not available in current environment; archive performed manually following `.github/prompts/openspec-archive.prompt.md` guardrails.
- Location: `openspec/changes/archive/add-dynamic-customers-contacts/`

## Next Steps (CLI)
When `openspec` CLI is available, validate and refresh specs:

```bash
openspec list
openspec show add-dynamic-customers-contacts
openspec validate --strict
```

## Notes
- Specs/design/tasks remain intact under this archived change.
- No changes to spec contents were made during archive.
- If the CLI supports index refresh, run `openspec update` to rebuild spec indexes.