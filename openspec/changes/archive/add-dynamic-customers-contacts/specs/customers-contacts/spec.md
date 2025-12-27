## ADDED Requirements

### Requirement: Customers are stored and served from database
Customers MUST be persisted in a `customers` table with usage metadata and surfaced via API for client filters.

#### Scenario: Fetch customers for filters
- **GIVEN** active customers exist in the database
- **WHEN** the client filter requests customers
- **THEN** the API returns customers with `is_active = 1` ordered by `usage_count` DESC then `LOWER(customer_name)` ASC

#### Scenario: Track customer usage on job creation
- **GIVEN** a new job is being created referencing a customer
- **WHEN** the job is saved
- **THEN** the system increments `usage_count` and sets `last_used` to the job's creation timestamp for that customer

### Requirement: Contacts are stored and served from database
Contacts MUST be persisted in a `contacts` table with usage metadata and served via API, optionally scoped by customer.

#### Scenario: Fetch contacts for filters
- **GIVEN** active contacts exist in the database
- **WHEN** the contact filter requests contacts (optionally scoped by `customer_name`)
- **THEN** the API returns contacts with `is_active = 1`, ordered by `usage_count` DESC then `LOWER(contact_name)` ASC, and filtered by `customer_name` when provided

#### Scenario: Track contact usage on job creation
- **GIVEN** a new job is being created referencing a contact
- **WHEN** the job is saved
- **THEN** the system increments `usage_count` and sets `last_used` to the job's creation timestamp for that contact
