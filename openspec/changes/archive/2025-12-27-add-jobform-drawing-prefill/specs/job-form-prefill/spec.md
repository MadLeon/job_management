## ADDED Requirements
### Requirement: Prefill revision and description on part blur
The job form SHALL, on part_number field blur, request detail_drawing data via /api/drawings/detail using the part number as drawing_number and prefill revision and description when available without overriding user-entered values.

#### Scenario: Prefill when drawing exists and fields empty
- **WHEN** the user blurs part_number with a value that matches detail_drawing.drawing_number
- **AND** revision and description fields are empty
- **THEN** the form requests /api/drawings/detail with drawing_number set to the part_number value
- **AND** fills revision and description from the API response

#### Scenario: No change when fields already filled
- **WHEN** the user blurs part_number with any value
- **AND** revision or description already contains user input
- **THEN** the form MAY request /api/drawings/detail
- **AND** MUST NOT overwrite the existing non-empty revision or description values

#### Scenario: Silent when drawing not found or API fails
- **WHEN** the lookup returns 404 or encounters an error
- **THEN** the form leaves revision and description unchanged
- **AND** the user can continue editing without interruption

#### Scenario: Coexist with file-location lookup
- **WHEN** part_number blur triggers
- **THEN** the existing drawing-file-location lookup remains enabled
- **AND** the revision/description prefill does not block or replace that behavior
