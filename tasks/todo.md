# TODO

- [x] 1. Confirm requirement: part_number blur should call detail_drawing lookup to prefill revision/description; silent if not found; do not override user-entered values; reuse existing /api/drawings/detail.
- [x] 2. Review current flow: JobForm blur handler, drawings detail API, and related consumers to ground proposal.
- [x] 3. Draft OpenSpec change: choose verb-led change-id, write proposal/tasks/spec delta, run `openspec validate --strict`.
- [x] 4. Share proposal for user approval before implementation.

## Review
- Created OpenSpec change add-jobform-drawing-prefill with proposal, tasks, and spec delta; validated successfully.
- Implemented part_number blur detail lookup in JobForm to prefill revision/part_description only when empty while keeping drawing-file-location fetch; errors/404 silent. Manual runtime testing not yet performed.
