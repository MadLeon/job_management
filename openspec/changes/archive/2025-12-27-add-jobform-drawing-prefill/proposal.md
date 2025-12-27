# Change: Add job form detail drawing prefill on part blur

## Why
- Reduce manual entry by auto-filling revision and description from detail_drawing when part numbers are provided.

## What Changes
- Trigger a lookup to detail_drawing on part_number blur, reusing /api/drawings/detail.
- Prefill revision and description only when the form fields are empty; leave user-entered values untouched.
- Keep the flow silent when no matching drawing exists or the API fails; do not block the existing file-location lookup.

## Impact
- Affected specs: job-form-prefill
- Affected code: JobForm blur handler, client call to /api/drawings/detail, optional API response handling logic.
