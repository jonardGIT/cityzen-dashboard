# Xypes CIRS API: Agency Contact Number Implementation

## Objective
Add a `contactNumber` field to the Agencies resource to capture phone/contact information for agency entities.

## Backend Requirements

### 1. Database Schema
- Add `contactNumber` column to the `agencies` table
- Type: `VARCHAR` (up to 20 characters recommended for international formats)
- Nullable: Yes (optional field)
- Example values: `+1-555-0100`, `(555) 0100`, `555-0100`

### 2. API Endpoints

#### GET /agencies
- Response shape unchanged
- Include `contactNumber` in response payload for each agency
- Example:
  ```json
  {
    "id": 1,
    "name": "Police District",
    "contactNumber": "+1-555-0100",
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

#### GET /agencies/{id}
- Include `contactNumber` in response
- Return null if not set

#### POST /agencies
- Accept `contactNumber` in request body (optional)
- Validate: if provided, ensure it's not excessively long (recommend max 20 chars)
- Store in database
- Return response with `contactNumber` field

#### PATCH /agencies/{id}
- Accept `contactNumber` in request body (optional)
- Allow null/empty to clear the field
- Return updated agency with `contactNumber`

### 3. Validation
- No strict format validation required (accept various phone formats)
- Recommend trimming whitespace
- Recommend rejecting if longer than 20 characters
- Support international formats (do not assume country-specific format)

### 4. Type Definitions
- Ensure `Agency` response type includes `contactNumber?: string`
- Document field as optional in OpenAPI/Swagger spec

## Frontend Integration (Already Complete)

### Dashboard Work
- Field config already includes `contactNumber` as a text field in agencies CRUD form
- Types updated: `Agency` interface includes `contactNumber?: string`
- Form will render a "Contact Number" text input on agency create/edit
- Generic CRUD layer handles validation and submission

### Form Behavior
- Not required (optional field)
- Text input type
- Displayed in agency list/detail views
- Sorting/filtering not yet configured

## Testing Checklist

### Smoke Tests
- [ ] GET /agencies returns agencies with contactNumber field (null or string)
- [ ] GET /agencies/{id} returns contactNumber field
- [ ] POST /agencies with contactNumber in body stores and returns the field
- [ ] PATCH /agencies/{id} updates contactNumber
- [ ] PATCH /agencies/{id} with empty/null contactNumber clears the field
- [ ] Dashboard form allows input and successfully submits agencies with contact numbers

### Edge Cases
- [ ] Very long contact numbers (test with 100+ chars) are rejected or truncated gracefully
- [ ] Special characters in contact numbers (e.g., +, -, (), spaces) are preserved
- [ ] Null/undefined contactNumber is handled correctly in responses
- [ ] Multiple agencies can have the same contact number without conflict

### Validation & Error Response
- [ ] Invalid POST/PATCH payloads return 422 with field-level error messages
- [ ] Authorization/role-based restrictions still apply (only admins can create/update)

## Example Payloads

### Create Agency with Contact
```json
POST /api/v1/agencies
{
  "name": "Emergency Response Unit",
  "contactNumber": "+1-555-0199"
}
```

### Update Agency Contact
```json
PATCH /api/v1/agencies/1
{
  "contactNumber": "(555) 0199"
}
```

### Clear Contact
```json
PATCH /api/v1/agencies/1
{
  "contactNumber": null
}
```

## Notes
- This is a non-breaking change; existing agencies without contactNumber can coexist
- No migration/data cleanup required for agencies that predate this field
- Frontend is already prepared to display and edit this field
