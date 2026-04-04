# API Reference

## Table of Contents

- [Common Patterns](#common-patterns)
- [Authentication](#authentication)
- [Users](#users)
- [Menu Items](#menu-items)
- [Languages](#languages)
- [Traits](#traits)
- [Trait Groups](#trait-groups)
- [Option Groups](#option-groups)
- [Options](#options)
- [Availability Rules](#availability-rules)
- [Settings](#settings)
- [Public Menu](#public-menu)
- [Media Proxy](#media-proxy)
- [WebSocket](#websocket)
- [Health Check](#health-check)

---

## Common Patterns

### Authentication

Protected endpoints require a session token in the `Authorization` header:

```
Authorization: Bearer <session-token>
```

Session tokens are returned by `POST /api/auth/register/verify` and `POST /api/auth/login/verify`.

### Roles

| Role    | Access                                      |
|---------|---------------------------------------------|
| `admin` | Full access to all endpoints                |
| `staff` | Menu management; cannot manage users/tokens |

### Error Responses

All errors return JSON with an `error` field. Error messages are generic and do not expose internal details:

```json
{ "error": "Description of the error" }
```

| Status | Meaning                          |
|--------|----------------------------------|
| 400    | Invalid input or request         |
| 401    | Missing or invalid session token |
| 403    | Authenticated but not authorized |
| 404    | Resource not found               |
| 500    | Internal server error            |

### Timestamps

All `*_at` fields are Unix timestamps (seconds since epoch).

---

## Authentication

WebAuthn / Passkey-based authentication. The flow has two phases: challenge then verify.

### Table of Contents

- [POST /api/auth/register/challenge](#post-apiauthregisterchallenge)
- [POST /api/auth/register/verify](#post-apiauthregisterverify)
- [POST /api/auth/login/challenge](#post-apiauthloginchallenge)
- [POST /api/auth/login/verify](#post-apiauthloginverify)
- [POST /api/auth/logout](#post-apiauthlogout)
- [GET /api/auth/me](#get-apiauthme)
- [POST /api/auth/registration-links](#post-apiauthregistration-links)
- [GET /api/auth/registration/:token](#get-apiauthregistrationtoken)
- [GET /api/auth/registration-tokens](#get-apiauthregistration-tokens)
- [DELETE /api/auth/registration-tokens/:token](#delete-apiauthregistration-tokenstoken)
- [GET /api/auth/expired-challenges/count](#get-apiauthexpired-challengescount)
- [DELETE /api/auth/expired-challenges](#delete-apiauthexpired-challenges)

---

### POST /api/auth/register/challenge

Starts passkey registration. Validates the invitation token and returns WebAuthn registration options.

**Authentication:** None

**Request body:**

```json
{ "token": "abc123xyz" }
```

| Field   | Type   | Required | Description                   |
|---------|--------|----------|-------------------------------|
| `token` | string | Yes      | Invitation token from the URL |

**Success response — 200:**

```json
{
  "options": {
    "challenge": "base64url-encoded-challenge",
    "rp": { "name": "Live Menu", "id": "example.com" },
    "user": { "id": "base64url-user-id", "name": "Jane", "displayName": "Jane" },
    "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
    "timeout": 60000,
    "attestation": "none"
  },
  "userId": 42,
  "challengeId": "uuid-v4"
}
```

**Error responses:**

```json
{ "error": "Invalid or expired token" }
```

```json
{ "error": "User not found" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/register/challenge \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123xyz"}'
```

---

### POST /api/auth/register/verify

Completes passkey registration. Verifies the authenticator response, saves the credential, creates a session, and marks the invitation token as used.

**Authentication:** None

**Request body:**

```json
{
  "userId": 42,
  "challengeId": "uuid-v4",
  "token": "abc123xyz",
  "deviceName": "MacBook Touch ID",
  "response": {
    "id": "base64url-credential-id",
    "rawId": "base64url-raw-id",
    "response": {
      "attestationObject": "base64url-attestation",
      "clientDataJSON": "base64url-client-data"
    }
  }
}
```

| Field        | Type   | Required | Description                               |
|--------------|--------|----------|-------------------------------------------|
| `userId`     | number | Yes      | User ID from the challenge response       |
| `challengeId`| string | Yes      | Challenge ID from the challenge response  |
| `token`      | string | Yes      | Invitation token                          |
| `deviceName` | string | No       | Human-readable device label               |
| `response`   | object | Yes      | WebAuthn `AuthenticatorAttestationResponse` |

**Success response — 200:**

```json
{
  "user": {
    "id": 42,
    "name": "Jane",
    "role": "staff",
    "is_active": true,
    "has_passkey": true,
    "created_at": 1700000000,
    "updated_at": 1700000000
  },
  "token": "session-token-string"
}
```

**Error responses:**

```json
{ "error": "Invalid or expired challenge" }
{ "error": "User ID mismatch" }
{ "error": "Verification failed" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/register/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 42,
    "challengeId": "uuid-v4",
    "token": "abc123xyz",
    "deviceName": "MacBook Touch ID",
    "response": {
      "id": "credId",
      "rawId": "credId",
      "response": {
        "attestationObject": "...",
        "clientDataJSON": "..."
      }
    }
  }'
```

---

### POST /api/auth/login/challenge

Starts passkey authentication. Returns WebAuthn authentication options.

**Authentication:** None

**Request body:** None

**Success response — 200:**

```json
{
  "options": {
    "challenge": "base64url-encoded-challenge",
    "timeout": 60000,
    "rpId": "example.com",
    "allowCredentials": [],
    "userVerification": "preferred"
  },
  "challengeId": "uuid-v4"
}
```

**Error responses:**

```json
{ "error": "Internal error" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/login/challenge
```

---

### POST /api/auth/login/verify

Completes passkey authentication. Verifies the authenticator response and creates a session.

**Authentication:** None

**Request body:**

```json
{
  "challengeId": "uuid-v4",
  "response": {
    "id": "base64url-credential-id",
    "rawId": "base64url-raw-id",
    "response": {
      "authenticatorData": "base64url-auth-data",
      "clientDataJSON": "base64url-client-data",
      "signature": "base64url-signature",
      "userHandle": "base64url-user-handle"
    }
  }
}
```

| Field         | Type   | Required | Description                                 |
|---------------|--------|----------|---------------------------------------------|
| `challengeId` | string | Yes      | Challenge ID from the challenge response    |
| `response`    | object | Yes      | WebAuthn `AuthenticatorAssertionResponse`   |

**Success response — 200:**

```json
{
  "user": {
    "id": 42,
    "name": "Jane",
    "role": "staff",
    "is_active": true,
    "has_passkey": true,
    "created_at": 1700000000,
    "updated_at": 1700000000
  },
  "token": "session-token-string"
}
```

**Error responses:**

```json
{ "error": "Invalid or expired challenge" }
{ "error": "Verification failed" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/login/verify \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "uuid-v4",
    "response": {
      "id": "credId",
      "rawId": "credId",
      "response": {
        "authenticatorData": "...",
        "clientDataJSON": "...",
        "signature": "..."
      }
    }
  }'
```

---

### POST /api/auth/logout

Deletes the current session. Always succeeds even if no session is present.

**Authentication:** Optional (Bearer token)

**Request body:** None

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/logout \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/auth/me

Returns the authenticated user's profile.

**Authentication:** Required (Bearer token)

**Success response — 200:**

```json
{
  "id": 42,
  "name": "Jane",
  "role": "staff",
  "is_active": true,
  "has_passkey": true,
  "created_at": 1700000000,
  "updated_at": 1700000000
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
```

**curl example:**

```bash
curl https://api.example.com/api/auth/me \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/auth/registration-links

Creates an invitation link for a new user. The link expires in 6 hours.

**Authentication:** Required (admin)

**Request body:**

```json
{
  "preFilledName": "John Smith",
  "role": "staff"
}
```

| Field           | Type                    | Required | Description                        |
|-----------------|-------------------------|----------|------------------------------------|
| `preFilledName` | string (1–255 chars)    | Yes      | Name pre-filled on the signup form |
| `role`          | `"admin"` \| `"staff"` | Yes      | Role assigned to the new user      |

**Success response — 200:**

```json
{
  "token": "abc123xyz",
  "url": "https://your-frontend.com/register/abc123xyz",
  "userId": 43,
  "expiresAt": 1700021600
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Pre-filled name is required" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/auth/registration-links \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"preFilledName": "John Smith", "role": "staff"}'
```

---

### GET /api/auth/registration/:token

Validates an invitation token. Used by the registration page to check whether the token is still valid before showing the form.

**Authentication:** None

**Path parameters:**

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| `token`   | string | Invitation token  |

**Success response — 200:**

```json
{
  "valid": true,
  "preFilledName": "John Smith",
  "role": "staff"
}
```

**Error responses:**

```json
{ "error": "Invalid or expired token" }
```

**curl example:**

```bash
curl https://api.example.com/api/auth/registration/abc123xyz
```

---

### GET /api/auth/registration-tokens

Lists all active (unused, non-expired) invitation tokens with the associated user name.

**Authentication:** Required (admin)

**Query parameters:**

| Parameter | Type   | Default | Max | Description         |
|-----------|--------|---------|-----|---------------------|
| `limit`   | number | 100     | 500 | Results per page    |
| `offset`  | number | 0       | —   | Pagination offset   |

**Success response — 200:**

```json
[
  {
    "token": "abc123xyz",
    "user_id": 43,
    "pre_filled_name": "John Smith",
    "role": "staff",
    "expires_at": 1700021600,
    "used_at": null,
    "created_by": 1,
    "created_at": 1700000000,
    "user_name": "John Smith"
  }
]
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl "https://api.example.com/api/auth/registration-tokens?limit=50&offset=0" \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/auth/registration-tokens/:token

Revokes an invitation token. If the invited user has not completed registration (no passkey), their account is also deleted.

**Authentication:** Required (admin)

**Path parameters:**

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| `token`   | string | Invitation token  |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/auth/registration-tokens/abc123xyz \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/auth/expired-challenges/count

Returns the count of expired WebAuthn challenges still in the database.

**Authentication:** Required (admin)

**Success response — 200:**

```json
{ "count": 12 }
```

**Error responses:**

```json
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl https://api.example.com/api/auth/expired-challenges/count \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/auth/expired-challenges

Purges all expired WebAuthn challenges from the database.

**Authentication:** Required (admin)

**Success response — 200:**

```json
{ "deleted": 12 }
```

**Error responses:**

```json
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/auth/expired-challenges \
  -H "Authorization: Bearer <session-token>"
```

---

## Users

### Table of Contents

- [GET /api/users](#get-apiusers)
- [GET /api/users/:id](#get-apiusersid)
- [PATCH /api/users/:id](#patch-apiusersid)
- [DELETE /api/users/:id](#delete-apiusersid)
- [GET /api/users/:id/passkeys](#get-apiusersidpasskeys)
- [DELETE /api/users/:id/passkeys/:credentialId](#delete-apiusersidpasskeyscredentialid)

---

### GET /api/users

Lists all users ordered by name.

**Authentication:** Required (admin)

**Query parameters:**

| Parameter | Type   | Default | Max | Description       |
|-----------|--------|---------|-----|-------------------|
| `limit`   | number | 100     | 500 | Results per page  |
| `offset`  | number | 0       | —   | Pagination offset |

**Success response — 200:**

```json
[
  {
    "id": 1,
    "name": "Admin User",
    "role": "admin",
    "is_active": 1,
    "has_passkey": 1,
    "created_at": 1700000000,
    "updated_at": 1700000000
  }
]
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl "https://api.example.com/api/users?limit=50&offset=0" \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/users/:id

Returns a single user. Admins can fetch any user; staff can only fetch themselves.

**Authentication:** Required (admin or self)

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | User ID     |

**Success response — 200:**

```json
{
  "id": 42,
  "name": "Jane",
  "role": "staff",
  "is_active": 1,
  "has_passkey": 1,
  "created_at": 1700000000,
  "updated_at": 1700000000
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Invalid id" }
{ "error": "User not found" }
```

**curl example:**

```bash
curl https://api.example.com/api/users/42 \
  -H "Authorization: Bearer <session-token>"
```

---

### PATCH /api/users/:id

Updates a user. Admins can update `name`, `is_active`, and `role`. Staff can only update their own `name`.

**Authentication:** Required (admin or self)

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | User ID     |

**Request body (all fields optional):**

```json
{
  "name": "Jane Doe",
  "is_active": true,
  "role": "admin"
}
```

| Field       | Type                    | Required | Description                    |
|-------------|-------------------------|----------|--------------------------------|
| `name`      | string (1–255 chars)    | No       | Display name                   |
| `is_active` | boolean                 | No       | Admin only                     |
| `role`      | `"admin"` \| `"staff"` | No       | Admin only                     |

**Success response — 200:** Returns the updated user object (same shape as GET).

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Invalid id" }
{ "error": "Staff can only update their name" }
```

**curl example:**

```bash
curl -X PATCH https://api.example.com/api/users/42 \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'
```

---

### DELETE /api/users/:id

Hard-deletes a user along with their sessions, passkeys, and registration tokens. Cannot delete yourself or the last admin.

**Authentication:** Required (admin)

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | User ID     |

**Success response — 200:**

```json
{ "success": true, "message": "User deleted successfully" }
```

**Error responses:**

```json
{ "error": "Admin access required" }
{ "error": "Invalid id" }
{ "error": "User not found" }
{ "error": "Cannot delete your own account" }
{ "error": "Cannot delete the last admin user" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/users/42 \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/users/:id/passkeys

Lists passkeys registered to a user. Admins can view any user's passkeys; staff can only view their own.

**Authentication:** Required (admin or self)

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | User ID     |

**Success response — 200:**

```json
[
  {
    "id": 1,
    "credential_id": "base64url-credential-id",
    "device_name": "MacBook Touch ID",
    "created_at": 1700000000
  }
]
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl https://api.example.com/api/users/42/passkeys \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/users/:id/passkeys/:credentialId

Removes a specific passkey. Admins can remove any passkey; staff can only remove their own.

**Authentication:** Required (admin or self)

**Path parameters:**

| Parameter      | Type    | Description                              |
|----------------|---------|------------------------------------------|
| `id`           | integer | User ID                                  |
| `credentialId` | string  | Credential ID (URL-safe base64 or raw)   |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE "https://api.example.com/api/users/42/passkeys/base64url-credential-id" \
  -H "Authorization: Bearer <session-token>"
```

---

## Menu Items

All menu item endpoints require authentication. Any authenticated user (admin or staff) can manage menu items.

### Table of Contents

- [GET /api/menu-items](#get-apimenu-items)
- [POST /api/menu-items](#post-apimenu-items)
- [GET /api/menu-items/:id](#get-apimenu-itemsid)
- [PATCH /api/menu-items/:id](#patch-apimenu-itemsid)
- [DELETE /api/menu-items/:id](#delete-apimenu-itemsid)
- [PUT /api/menu-items/reorder](#put-apimenu-itemsreorder)
- [PUT /api/menu-items/:id/names/:lang](#put-apimenu-itemsidnameslang)
- [DELETE /api/menu-items/:id/names/:lang](#delete-apimenu-itemsidnameslang)
- [POST /api/menu-items/:id/media/:lang](#post-apimenu-itemsidmedialang)
- [DELETE /api/menu-items/:id/media/:lang](#delete-apimenu-itemsidmedialang)
- [PUT /api/menu-items/:id/traits/:traitId](#put-apimenu-itemsidtraitstraitid)
- [DELETE /api/menu-items/:id/traits/:traitId](#delete-apimenu-itemsidtraitstraitid)
- [PUT /api/menu-items/:id/option-groups/:groupId](#put-apimenu-itemsidoption-groupsgroupid)
- [DELETE /api/menu-items/:id/option-groups/:groupId](#delete-apimenu-itemsidoption-groupsgroupid)
- [GET /api/menu-items/:id/availability-rules](#get-apimenu-itemsidavailability-rules)
- [POST /api/menu-items/:id/availability-rules](#post-apimenu-itemsidavailability-rules)

---

### GET /api/menu-items

Lists all menu items including hidden ones, with their names and media variants for all languages.

**Authentication:** Required

**Success response — 200:**

```json
[
  {
    "id": 1,
    "sort_order": 0,
    "is_visible": true,
    "created_at": 1700000000,
    "updated_at": 1700000000,
    "names": [
      {
        "id": 1,
        "menu_item_id": 1,
        "language_code": "en",
        "name": "Margherita Pizza",
        "created_at": 1700000000,
        "updated_at": 1700000000
      }
    ],
    "media": [
      {
        "id": 1,
        "menu_item_id": 1,
        "language_code": "en",
        "media_type": "image",
        "r2_key": "items/1/en/photo.jpg",
        "original_filename": "photo.jpg",
        "content_type": "image/jpeg",
        "file_size": 204800,
        "created_at": 1700000000,
        "updated_at": 1700000000
      }
    ]
  }
]
```

**Error responses:**

```json
{ "error": "Unauthorized" }
```

**curl example:**

```bash
curl https://api.example.com/api/menu-items \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/menu-items

Creates a new blank menu item with no names or media.

**Authentication:** Required

**Request body:** None

**Success response — 201:**

```json
{
  "id": 2,
  "sort_order": 1,
  "is_visible": false,
  "created_at": 1700000000,
  "updated_at": 1700000000,
  "names": [],
  "media": []
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/menu-items \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/menu-items/:id

Returns a single menu item with all names and media variants.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Success response — 200:** Same shape as a single element in GET /api/menu-items.

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "Not found" }
```

**curl example:**

```bash
curl https://api.example.com/api/menu-items/1 \
  -H "Authorization: Bearer <session-token>"
```

---

### PATCH /api/menu-items/:id

Updates a menu item's visibility, base price, and/or schedule window.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Request body:**

```json
{ "is_visible": true, "base_price": 4.50, "schedule_start": "2026-06-01T09:00:00", "schedule_end": null }
```

| Field            | Type            | Required | Description                                                   |
|------------------|-----------------|----------|---------------------------------------------------------------|
| `is_visible`     | boolean         | No       | Show or hide the item                                         |
| `base_price`     | number          | No       | Base price in cents (integer, ≥ 0)                            |
| `schedule_start` | string \| null  | No       | Start of date window (ISO 8601 local datetime), `null` to clear |
| `schedule_end`   | string \| null  | No       | End of date window (ISO 8601 local datetime), `null` to clear   |

**Success response — 200:** Returns the updated menu item with names and media.

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X PATCH https://api.example.com/api/menu-items/1 \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"is_visible": true}'
```

---

### DELETE /api/menu-items/:id

Deletes a menu item and all its names and media variants. R2 objects are also deleted.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/menu-items/1 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/menu-items/reorder

Sets the `sort_order` for multiple items in a single batch operation.

**Authentication:** Required

**Request body:**

```json
{
  "items": [
    { "id": 3, "sort_order": 0 },
    { "id": 1, "sort_order": 1 },
    { "id": 2, "sort_order": 2 }
  ]
}
```

| Field               | Type    | Required | Description           |
|---------------------|---------|----------|-----------------------|
| `items`             | array   | Yes      | Items to reorder      |
| `items[].id`        | integer | Yes      | Menu item ID          |
| `items[].sort_order`| integer | Yes      | New position (≥ 0)    |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Validation error" }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/menu-items/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 3, "sort_order": 0}, {"id": 1, "sort_order": 1}]}'
```

---

### PUT /api/menu-items/:id/names/:lang

Creates or replaces the name and optional description for a menu item in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `id`      | integer | Menu item ID                     |
| `lang`    | string  | Language code (e.g. `en`, `fr`)  |

**Request body:**

```json
{ "name": "Margherita Pizza", "description": "Classic Italian pizza with fresh mozzarella" }
```

| Field         | Type                   | Required | Description                    |
|---------------|------------------------|----------|--------------------------------|
| `name`        | string (1–500 chars)   | Yes      | Localized name                 |
| `description` | string (≤ 2000 chars)  | No       | Localized description (nullable) |

**Success response — 200:**

```json
{
  "id": 1,
  "menu_item_id": 1,
  "language_code": "en",
  "name": "Margherita Pizza",
  "created_at": 1700000000,
  "updated_at": 1700000000
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "Validation error" }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/menu-items/1/names/en \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Margherita Pizza"}'
```

---

### DELETE /api/menu-items/:id/names/:lang

Removes the name for a menu item in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `id`      | integer | Menu item ID                     |
| `lang`    | string  | Language code (e.g. `en`, `fr`)  |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/menu-items/1/names/en \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/menu-items/:id/media/:lang

Uploads a media file (image or video) for a menu item in a given language. Uses multipart/form-data. Replaces any existing media for the same item + language combination.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `id`      | integer | Menu item ID                     |
| `lang`    | string  | Language code (e.g. `en`, `fr`)  |

**Request body:** `multipart/form-data`

| Field  | Type | Required | Description                 |
|--------|------|----------|-----------------------------|
| `file` | File | Yes      | Image or video file to upload |

**Success response — 201:**

```json
{
  "id": 1,
  "menu_item_id": 1,
  "language_code": "en",
  "media_type": "image",
  "r2_key": "items/1/en/photo.jpg",
  "original_filename": "photo.jpg",
  "content_type": "image/jpeg",
  "file_size": 204800,
  "created_at": 1700000000,
  "updated_at": 1700000000
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "Missing file field in multipart body" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/menu-items/1/media/en \
  -H "Authorization: Bearer <session-token>" \
  -F "file=@/path/to/photo.jpg"
```

---

### DELETE /api/menu-items/:id/media/:lang

Removes the media variant for a menu item in a given language. The R2 object is also deleted.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `id`      | integer | Menu item ID                     |
| `lang`    | string  | Language code (e.g. `en`, `fr`)  |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/menu-items/1/media/en \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/menu-items/:id/traits/:traitId

Assigns a trait to a menu item.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |
| `traitId` | integer | Trait ID     |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/menu-items/1/traits/3 \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/menu-items/:id/traits/:traitId

Removes a trait from a menu item.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |
| `traitId` | integer | Trait ID     |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/menu-items/1/traits/3 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/menu-items/:id/option-groups/:groupId

Assigns an option group to a menu item.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description     |
|-----------|---------|-----------------|
| `id`      | integer | Menu item ID    |
| `groupId` | integer | Option group ID |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/menu-items/1/option-groups/2 \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/menu-items/:id/option-groups/:groupId

Removes an option group from a menu item.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description     |
|-----------|---------|-----------------|
| `id`      | integer | Menu item ID    |
| `groupId` | integer | Option group ID |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/menu-items/1/option-groups/2 \
  -H "Authorization: Bearer <session-token>"
```

---

### GET /api/menu-items/:id/availability-rules

Lists all availability rules for a menu item.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Success response — 200:**

```json
[
  {
    "id": 1,
    "menu_item_id": 1,
    "start_time": "08:00",
    "end_time": "14:00",
    "day_sun": 0,
    "day_mon": 1,
    "day_tue": 1,
    "day_wed": 1,
    "day_thu": 1,
    "day_fri": 1,
    "day_sat": 0,
    "created_at": "2026-04-01T12:00:00.000Z",
    "updated_at": "2026-04-01T12:00:00.000Z"
  }
]
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
```

**curl example:**

```bash
curl https://api.example.com/api/menu-items/1/availability-rules \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/menu-items/:id/availability-rules

Creates an availability rule for a menu item. The rule defines a time-of-day range and day-of-week toggles. Multiple rules per item are OR'd together.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Request body:**

```json
{
  "start_time": "08:00",
  "end_time": "14:00",
  "day_sun": 0,
  "day_mon": 1,
  "day_tue": 1,
  "day_wed": 1,
  "day_thu": 1,
  "day_fri": 1,
  "day_sat": 0
}
```

| Field        | Type           | Required | Description                                          |
|--------------|----------------|----------|------------------------------------------------------|
| `start_time` | string (HH:MM) | Yes      | Start of time window (no midnight crossing)          |
| `end_time`   | string (HH:MM) | Yes      | End of time window (must be after start_time)        |
| `day_sun`    | integer (0/1)  | Yes      | Active on Sunday                                     |
| `day_mon`    | integer (0/1)  | Yes      | Active on Monday                                     |
| `day_tue`    | integer (0/1)  | Yes      | Active on Tuesday                                    |
| `day_wed`    | integer (0/1)  | Yes      | Active on Wednesday                                  |
| `day_thu`    | integer (0/1)  | Yes      | Active on Thursday                                   |
| `day_fri`    | integer (0/1)  | Yes      | Active on Friday                                     |
| `day_sat`    | integer (0/1)  | Yes      | Active on Saturday                                   |

**Success response — 201:** Returns the created rule (same shape as GET list elements).

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "end_time must be after start_time (no midnight crossing)" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/menu-items/1/availability-rules \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"start_time":"08:00","end_time":"14:00","day_sun":0,"day_mon":1,"day_tue":1,"day_wed":1,"day_thu":1,"day_fri":1,"day_sat":0}'
```

---

## Availability Rules

Standalone endpoints for updating and deleting individual availability rules (created via `POST /api/menu-items/:id/availability-rules`).

### Table of Contents

- [PATCH /api/availability-rules/:id](#patch-apiavailability-rulesid)
- [DELETE /api/availability-rules/:id](#delete-apiavailability-rulesid)

---

### PATCH /api/availability-rules/:id

Updates an existing availability rule. All fields are optional.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description           |
|-----------|---------|------------------------|
| `id`      | integer | Availability rule ID   |

**Request body (all fields optional):**

```json
{ "start_time": "09:00", "end_time": "17:00", "day_sat": 1 }
```

| Field        | Type           | Required | Description                                          |
|--------------|----------------|----------|------------------------------------------------------|
| `start_time` | string (HH:MM) | No       | Start of time window                                 |
| `end_time`   | string (HH:MM) | No       | End of time window (must be after start_time)        |
| `day_sun`    | integer (0/1)  | No       | Active on Sunday                                     |
| `day_mon`    | integer (0/1)  | No       | Active on Monday                                     |
| `day_tue`    | integer (0/1)  | No       | Active on Tuesday                                    |
| `day_wed`    | integer (0/1)  | No       | Active on Wednesday                                  |
| `day_thu`    | integer (0/1)  | No       | Active on Thursday                                   |
| `day_fri`    | integer (0/1)  | No       | Active on Friday                                     |
| `day_sat`    | integer (0/1)  | No       | Active on Saturday                                   |

**Success response — 200:** Returns the updated rule.

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "Not found" }
{ "error": "end_time must be after start_time (no midnight crossing)" }
```

**curl example:**

```bash
curl -X PATCH https://api.example.com/api/availability-rules/1 \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"start_time": "09:00", "end_time": "17:00"}'
```

---

### DELETE /api/availability-rules/:id

Deletes an availability rule.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description           |
|-----------|---------|------------------------|
| `id`      | integer | Availability rule ID   |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Invalid id" }
{ "error": "Not found" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/availability-rules/1 \
  -H "Authorization: Bearer <session-token>"
```

---

## Languages

### Table of Contents

- [GET /api/languages](#get-apilanguages)
- [POST /api/languages](#post-apilanguages)
- [DELETE /api/languages/:code](#delete-apilanguagescode)

---

### GET /api/languages

Lists all configured languages. Public — no authentication required.

**Authentication:** None

**Success response — 200:**

```json
[
  {
    "code": "en",
    "display_name": "English",
    "is_base": true,
    "sort_order": 0,
    "created_at": 1700000000
  },
  {
    "code": "fr",
    "display_name": "French",
    "is_base": false,
    "sort_order": 1,
    "created_at": 1700000000
  }
]
```

**curl example:**

```bash
curl https://api.example.com/api/languages
```

---

### POST /api/languages

Adds a new language.

**Authentication:** Required (admin)

**Request body:**

```json
{
  "code": "fr",
  "displayName": "French"
}
```

| Field         | Type                 | Required | Description                  |
|---------------|----------------------|----------|------------------------------|
| `code`        | string (exactly 2 chars) | Yes  | ISO 639-1 language code      |
| `displayName` | string (1–100 chars) | Yes      | Human-readable language name |

**Success response — 201:**

```json
{
  "code": "fr",
  "display_name": "French",
  "is_base": false,
  "sort_order": 2,
  "created_at": 1700000000
}
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Validation error" }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/languages \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "fr", "displayName": "French"}'
```

---

### DELETE /api/languages/:code

Removes a language and all associated names and media variants (including R2 objects).

**Authentication:** Required (admin)

**Path parameters:**

| Parameter | Type   | Description                  |
|-----------|--------|------------------------------|
| `code`    | string | 2-character language code    |

**Success response — 200:**

```json
{ "success": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/languages/fr \
  -H "Authorization: Bearer <session-token>"
```

---

## Traits

Traits represent drink characteristics (e.g., "Contains Milk", "Matcha", "Caffeinated"). All endpoints require authentication.

### Table of Contents

- [GET /api/traits](#get-apitraits)
- [POST /api/traits](#post-apitraits)
- [DELETE /api/traits/:id](#delete-apitraitsid)
- [PUT /api/traits/reorder](#put-apitraitsreorder)
- [PUT /api/traits/:id/names/:lang](#put-apitraitsidnameslang)
- [DELETE /api/traits/:id/names/:lang](#delete-apitraitsidnameslang)

---

### GET /api/traits

Lists all traits with their names.

**Authentication:** Required

**Success response — 200:**

```json
[
  {
    "id": 1,
    "sort_order": 0,
    "names": [
      { "trait_id": 1, "language_code": "GB", "name": "Milk", "description": null }
    ]
  }
]
```

**curl example:**

```bash
curl https://api.example.com/api/traits \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/traits

Creates a new blank trait.

**Authentication:** Required

**Request body:** None

**Success response — 201:**

```json
{ "id": 2, "sort_order": 1, "names": [] }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/traits \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/traits/:id

Deletes a trait and all its names. Also removes the trait from any trait groups and menu items.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | Trait ID    |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/traits/1 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/traits/reorder

Batch reorder traits.

**Authentication:** Required

**Request body:**

```json
{
  "items": [
    { "id": 2, "sort_order": 0 },
    { "id": 1, "sort_order": 1 }
  ]
}
```

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/traits/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 2, "sort_order": 0}, {"id": 1, "sort_order": 1}]}'
```

---

### PUT /api/traits/:id/names/:lang

Creates or replaces a trait's name and optional description in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Trait ID                         |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Request body:**

```json
{ "name": "Milk", "description": "Contains dairy milk" }
```

| Field         | Type                   | Required | Description                    |
|---------------|------------------------|----------|--------------------------------|
| `name`        | string (1–500 chars)   | Yes      | Localized name                 |
| `description` | string (≤ 2000 chars)  | No       | Localized description (nullable) |

**Success response — 200:** Returns the upserted name object.

**curl example:**

```bash
curl -X PUT https://api.example.com/api/traits/1/names/GB \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Milk"}'
```

---

### DELETE /api/traits/:id/names/:lang

Removes a trait's name for a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Trait ID                         |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/traits/1/names/FR \
  -H "Authorization: Bearer <session-token>"
```

---

## Trait Groups

Trait groups organise traits into categories (e.g., "Milk Preference", "Flavour"). Each group contains an ordered list of traits. All endpoints require authentication.

### Table of Contents

- [GET /api/trait-groups](#get-apitrait-groups)
- [POST /api/trait-groups](#post-apitrait-groups)
- [DELETE /api/trait-groups/:id](#delete-apitrait-groupsid)
- [PUT /api/trait-groups/reorder](#put-apitrait-groupsreorder)
- [PUT /api/trait-groups/:id/names/:lang](#put-apitrait-groupsidnameslang)
- [DELETE /api/trait-groups/:id/names/:lang](#delete-apitrait-groupsidnameslang)
- [PUT /api/trait-groups/:id/traits/:traitId](#put-apitrait-groupsidtraitstraitid)
- [DELETE /api/trait-groups/:id/traits/:traitId](#delete-apitrait-groupsidtraitstraitid)
- [PUT /api/trait-groups/:id/traits/reorder](#put-apitrait-groupsidtraitsreorder)

---

### GET /api/trait-groups

Lists all trait groups with their names and associated traits.

**Authentication:** Required

**Success response — 200:**

```json
[
  {
    "id": 1,
    "sort_order": 0,
    "names": [
      { "trait_group_id": 1, "language_code": "GB", "name": "Milk Preference", "description": null }
    ],
    "traits": [
      { "trait_id": 2, "sort_order": 0 }
    ]
  }
]
```

**curl example:**

```bash
curl https://api.example.com/api/trait-groups \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/trait-groups

Creates a new blank trait group.

**Authentication:** Required

**Request body:** None

**Success response — 201:**

```json
{ "id": 2, "sort_order": 1, "names": [], "traits": [] }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/trait-groups \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/trait-groups/:id

Deletes a trait group and all its names. Does not delete the traits themselves.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description    |
|-----------|---------|----------------|
| `id`      | integer | Trait group ID |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/trait-groups/1 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/trait-groups/reorder

Batch reorder trait groups.

**Authentication:** Required

**Request body:**

```json
{
  "items": [
    { "id": 2, "sort_order": 0 },
    { "id": 1, "sort_order": 1 }
  ]
}
```

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/trait-groups/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 2, "sort_order": 0}, {"id": 1, "sort_order": 1}]}'
```

---

### PUT /api/trait-groups/:id/names/:lang

Creates or replaces a trait group's name and optional description in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Trait group ID                   |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Request body:**

```json
{ "name": "Milk Preference", "description": "Choose your milk type" }
```

| Field         | Type                   | Required | Description                    |
|---------------|------------------------|----------|--------------------------------|
| `name`        | string (1–500 chars)   | Yes      | Localized name                 |
| `description` | string (≤ 2000 chars)  | No       | Localized description (nullable) |

**Success response — 200:** Returns the upserted name object.

**curl example:**

```bash
curl -X PUT https://api.example.com/api/trait-groups/1/names/GB \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Milk Preference"}'
```

---

### DELETE /api/trait-groups/:id/names/:lang

Removes a trait group's name for a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Trait group ID                   |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/trait-groups/1/names/FR \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/trait-groups/:id/traits/:traitId

Adds a trait to a trait group.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description    |
|-----------|---------|----------------|
| `id`      | integer | Trait group ID |
| `traitId` | integer | Trait ID       |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/trait-groups/1/traits/3 \
  -H "Authorization: Bearer <session-token>"
```

---

### DELETE /api/trait-groups/:id/traits/:traitId

Removes a trait from a trait group. Does not delete the trait itself.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description    |
|-----------|---------|----------------|
| `id`      | integer | Trait group ID |
| `traitId` | integer | Trait ID       |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/trait-groups/1/traits/3 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/trait-groups/:id/traits/reorder

Reorder traits within a trait group.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description    |
|-----------|---------|----------------|
| `id`      | integer | Trait group ID |

**Request body:**

```json
{
  "items": [
    { "id": 3, "sort_order": 0 },
    { "id": 5, "sort_order": 1 }
  ]
}
```

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/trait-groups/1/traits/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 3, "sort_order": 0}, {"id": 5, "sort_order": 1}]}'
```

---

## Option Groups

Option groups define customisation categories for menu items (e.g., "Size", "Milk Type"). Each group contains options with price deltas and has `multi_select` and `required` flags. All endpoints require authentication.

### Table of Contents

- [GET /api/option-groups](#get-apioption-groups)
- [POST /api/option-groups](#post-apioption-groups)
- [PATCH /api/option-groups/:id](#patch-apioption-groupsid)
- [DELETE /api/option-groups/:id](#delete-apioption-groupsid)
- [PUT /api/option-groups/reorder](#put-apioption-groupsreorder)
- [PUT /api/option-groups/:id/names/:lang](#put-apioption-groupsidnameslang)
- [DELETE /api/option-groups/:id/names/:lang](#delete-apioption-groupsidnameslang)

---

### GET /api/option-groups

Lists all option groups with their names and options.

**Authentication:** Required

**Success response — 200:**

```json
[
  {
    "id": 1,
    "sort_order": 0,
    "multi_select": 0,
    "required": 0,
    "names": [
      { "option_group_id": 1, "language_code": "GB", "name": "Size", "description": null }
    ],
    "options": [
      {
        "id": 1,
        "option_group_id": 1,
        "sort_order": 0,
        "price_delta": 0.50,
        "names": [
          { "option_id": 1, "language_code": "GB", "name": "Large", "description": null }
        ]
      }
    ]
  }
]
```

**curl example:**

```bash
curl https://api.example.com/api/option-groups \
  -H "Authorization: Bearer <session-token>"
```

---

### POST /api/option-groups

Creates a new blank option group.

**Authentication:** Required

**Request body:** None

**Success response — 201:**

```json
{ "id": 2, "sort_order": 1, "multi_select": 0, "required": 0, "names": [], "options": [] }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/option-groups \
  -H "Authorization: Bearer <session-token>"
```

---

### PATCH /api/option-groups/:id

Updates option group flags.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description     |
|-----------|---------|-----------------|
| `id`      | integer | Option group ID |

**Request body:**

```json
{ "multi_select": 1, "required": 1 }
```

| Field          | Type          | Required | Description                        |
|----------------|---------------|----------|------------------------------------|
| `multi_select` | integer (0/1) | No       | Allow multiple options to be chosen |
| `required`     | integer (0/1) | No       | Customer must choose an option      |

**Success response — 200:** Returns the updated option group.

**curl example:**

```bash
curl -X PATCH https://api.example.com/api/option-groups/1 \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"multi_select": 1}'
```

---

### DELETE /api/option-groups/:id

Deletes an option group and all its options and names.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description     |
|-----------|---------|-----------------|
| `id`      | integer | Option group ID |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/option-groups/1 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/option-groups/reorder

Batch reorder option groups.

**Authentication:** Required

**Request body:**

```json
{
  "items": [
    { "id": 2, "sort_order": 0 },
    { "id": 1, "sort_order": 1 }
  ]
}
```

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/option-groups/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 2, "sort_order": 0}, {"id": 1, "sort_order": 1}]}'
```

---

### PUT /api/option-groups/:id/names/:lang

Creates or replaces an option group's name and optional description in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Option group ID                  |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Request body:**

```json
{ "name": "Size", "description": "Choose your cup size" }
```

| Field         | Type                   | Required | Description                    |
|---------------|------------------------|----------|--------------------------------|
| `name`        | string (1–500 chars)   | Yes      | Localized name                 |
| `description` | string (≤ 2000 chars)  | No       | Localized description (nullable) |

**Success response — 200:** Returns the upserted name object.

**curl example:**

```bash
curl -X PUT https://api.example.com/api/option-groups/1/names/GB \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Size"}'
```

---

### DELETE /api/option-groups/:id/names/:lang

Removes an option group's name for a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Option group ID                  |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/option-groups/1/names/FR \
  -H "Authorization: Bearer <session-token>"
```

---

## Options

Options belong to option groups and represent individual choices (e.g., "Large", "Oat Milk") with optional price deltas. All endpoints require authentication.

### Table of Contents

- [POST /api/options](#post-apioptions)
- [PATCH /api/options/:id](#patch-apioptionsid)
- [DELETE /api/options/:id](#delete-apioptionsid)
- [PUT /api/options/reorder](#put-apioptionsreorder)
- [PUT /api/options/:id/names/:lang](#put-apioptionsidnameslang)
- [DELETE /api/options/:id/names/:lang](#delete-apioptionsidnameslang)

---

### POST /api/options

Creates a new option in a specified option group.

**Authentication:** Required

**Request body:**

```json
{ "option_group_id": 1 }
```

| Field             | Type    | Required | Description                    |
|-------------------|---------|----------|--------------------------------|
| `option_group_id` | integer | Yes      | ID of the parent option group  |

**Success response — 201:**

```json
{ "id": 3, "option_group_id": 1, "sort_order": 2, "price_delta": 0, "names": [] }
```

**curl example:**

```bash
curl -X POST https://api.example.com/api/options \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"option_group_id": 1}'
```

---

### PATCH /api/options/:id

Updates an option's price delta.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | Option ID   |

**Request body:**

```json
{ "price_delta": 0.50 }
```

| Field         | Type   | Required | Description                        |
|---------------|--------|----------|------------------------------------|
| `price_delta` | number | No       | Price adjustment from the base price |

**Success response — 200:** Returns the updated option.

**curl example:**

```bash
curl -X PATCH https://api.example.com/api/options/3 \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"price_delta": 0.50}'
```

---

### DELETE /api/options/:id

Deletes an option and all its names.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `id`      | integer | Option ID   |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/options/3 \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/options/reorder

Batch reorder options.

**Authentication:** Required

**Request body:**

```json
{
  "items": [
    { "id": 3, "sort_order": 0 },
    { "id": 1, "sort_order": 1 }
  ]
}
```

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X PUT https://api.example.com/api/options/reorder \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": 3, "sort_order": 0}, {"id": 1, "sort_order": 1}]}'
```

---

### PUT /api/options/:id/names/:lang

Creates or replaces an option's name and optional description in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Option ID                        |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Request body:**

```json
{ "name": "Large", "description": "+100ml" }
```

| Field         | Type                   | Required | Description                    |
|---------------|------------------------|----------|--------------------------------|
| `name`        | string (1–500 chars)   | Yes      | Localized name                 |
| `description` | string (≤ 2000 chars)  | No       | Localized description (nullable) |

**Success response — 200:** Returns the upserted name object.

**curl example:**

```bash
curl -X PUT https://api.example.com/api/options/3/names/GB \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Large"}'
```

---

### DELETE /api/options/:id/names/:lang

Removes an option's name for a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                     |
|-----------|---------|----------------------------------|
| `id`      | integer | Option ID                        |
| `lang`    | string  | Language code (e.g. `GB`, `FR`)  |

**Success response — 200:**

```json
{ "success": true }
```

**curl example:**

```bash
curl -X DELETE https://api.example.com/api/options/3/names/FR \
  -H "Authorization: Bearer <session-token>"
```

---

## Settings

Key-value settings store (currency symbol, UI translations, etc.). All endpoints require authentication.

Setting keys must match the pattern `/^[a-z0-9:_-]{1,100}$/` (lowercase alphanumeric, colons, underscores, hyphens; max 100 chars).

### Table of Contents

- [GET /api/settings](#get-apisettings)
- [PUT /api/settings/:key](#put-apisettingskey)

---

### GET /api/settings

Returns all settings as an array of key-value pairs.

**Authentication:** Required

**Success response — 200:**

```json
[
  { "key": "currency", "value": "€" },
  { "key": "ui:find_your_drink:GB", "value": "Find Your Drink" }
]
```

**curl example:**

```bash
curl https://api.example.com/api/settings \
  -H "Authorization: Bearer <session-token>"
```

---

### PUT /api/settings/:key

Creates or updates a setting value.

**Authentication:** Required

**Path parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| `key`     | string | Setting key  |

**Request body:**

```json
{ "value": "€" }
```

| Field   | Type                    | Required | Description    |
|---------|-------------------------|----------|----------------|
| `value` | string (≤ 10000 chars)  | Yes      | Setting value  |

**Success response — 200:** Returns the upserted setting.

**curl example:**

```bash
curl -X PUT https://api.example.com/api/settings/currency \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"value": "€"}'
```

---

## Public Menu

### GET /api/public/menu

Returns the full menu for public display: only visible items (including their scheduling data), all configured languages, trait groups, option groups, settings, and a version timestamp for cache diffing. Schedule-based visibility is evaluated client-side.

**Authentication:** None

**Success response — 200:**

```json
{
  "items": [
    {
      "id": 1,
      "sort_order": 0,
      "is_visible": true,
      "schedule_start": "2026-06-01T09:00:00",
      "schedule_end": null,
      "created_at": 1700000000,
      "updated_at": 1700000000,
      "names": [
        {
          "id": 1,
          "menu_item_id": 1,
          "language_code": "GB",
          "name": "Matcha Latte",
          "description": "Creamy matcha green tea",
          "created_at": 1700000000,
          "updated_at": 1700000000
        }
      ],
      "media": [ ... ],
      "availabilityRules": [
        {
          "id": 1,
          "menu_item_id": 1,
          "start_time": "08:00",
          "end_time": "14:00",
          "day_sun": 0,
          "day_mon": 1,
          "day_tue": 1,
          "day_wed": 1,
          "day_thu": 1,
          "day_fri": 1,
          "day_sat": 0,
          "created_at": "2026-04-01T12:00:00.000Z",
          "updated_at": "2026-04-01T12:00:00.000Z"
        }
      ]
    }
  ],
  "languages": [
    {
      "code": "GB",
      "display_name": "English",
      "is_base": true,
      "sort_order": 0,
      "created_at": 1700000000
    }
  ],
  "traitGroups": [ ... ],
  "optionGroups": [ ... ],
  "settings": [
    { "key": "currency", "value": "€" }
  ],
  "version": 1700000000
}
```

**curl example:**

```bash
curl https://api.example.com/api/public/menu
```

---

## Media Proxy

### GET /media/*

Serves files stored in Cloudflare R2. Requests are forwarded by the Worker — clients never access R2 directly.

**Authentication:** None

**Path parameters:**

| Parameter | Type   | Description                           |
|-----------|--------|---------------------------------------|
| `*`       | string | R2 object key (e.g. `items/1/en/photo.jpg`) |

**Restrictions:** Path traversal (`..`) and leading slashes are rejected with `403 Forbidden`. Empty keys return `403 Forbidden`.

**Success response — 200:** File body with `Content-Type` from R2 metadata and `Cache-Control: public, max-age=31536000, immutable`.

**Error responses:**

| Status | Body        | Condition                    |
|--------|-------------|------------------------------|
| 403    | `Forbidden` | Path traversal or empty key  |
| 404    | `Not Found` | Key does not exist in R2     |

**curl example:**

```bash
curl https://api.example.com/media/items/1/en/photo.jpg
```

---

## WebSocket

### /api/sync-ws

Real-time version-vector sync. Upgrades an HTTP connection to WebSocket using the Cloudflare Hibernation API via a `BroadcastRoom` Durable Object.

**Authentication:** Session token passed as a query parameter (validated against the `sessions` table before the upgrade).

**Connection:**

```
GET /api/sync-ws?token=<session-token>
Upgrade: websocket
```

| Query param | Type   | Required | Description           |
|-------------|--------|----------|-----------------------|
| `token`     | string | Yes      | Valid session token   |

**Error responses (HTTP, before upgrade):**

| Status | Body            | Condition                           |
|--------|-----------------|-------------------------------------|
| 401    | `Unauthorized`  | `token` query param missing         |
| 401    | `Unauthorized`  | Token not found or expired in DB    |

**Messages from server:**

After connection, the server broadcasts version-vector updates to all connected clients whenever a resource changes:

```json
{
  "type": "version_update",
  "vector": {
    "menuItem": 1700000001,
    "media": 1700000002,
    "language": 1700000000,
    "user": 1700000003
  }
}
```

The `vector` maps resource keys (`menuItem`, `media`, `language`, `user`, `trait`, `traitGroup`, `option`, `optionGroup`, `setting`) to Unix timestamps representing the last known change. Clients compare these values to decide whether to refetch.

**curl example (connection test):**

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  "https://api.example.com/api/sync-ws?token=<session-token>"
```

---

## Health Check

### GET /api/health

Returns `200 OK` when the Worker is running.

**Authentication:** None

**Success response — 200:**

```json
{ "status": "ok" }
```

**curl example:**

```bash
curl https://api.example.com/api/health
```
