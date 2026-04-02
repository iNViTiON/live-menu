# API Reference

## Table of Contents

- [Common Patterns](#common-patterns)
- [Authentication](#authentication)
- [Users](#users)
- [Menu Items](#menu-items)
- [Languages](#languages)
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

All errors return JSON with an `error` field:

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

Updates a menu item's visibility.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description  |
|-----------|---------|--------------|
| `id`      | integer | Menu item ID |

**Request body:**

```json
{ "is_visible": true }
```

| Field        | Type    | Required | Description              |
|--------------|---------|----------|--------------------------|
| `is_visible` | boolean | No       | Show or hide the item    |

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

Creates or replaces the name for a menu item in a given language.

**Authentication:** Required

**Path parameters:**

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `id`      | integer | Menu item ID                     |
| `lang`    | string  | Language code (e.g. `en`, `fr`)  |

**Request body:**

```json
{ "name": "Margherita Pizza" }
```

| Field  | Type               | Required | Description     |
|--------|--------------------|----------|-----------------|
| `name` | string (1–500 chars) | Yes    | Localized name  |

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

## Public Menu

### GET /api/public/menu

Returns the full menu for public display: only visible items, all configured languages, and a version timestamp for cache diffing.

**Authentication:** None

**Success response — 200:**

```json
{
  "items": [
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
  ],
  "languages": [
    {
      "code": "en",
      "display_name": "English",
      "is_base": true,
      "sort_order": 0,
      "created_at": 1700000000
    }
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

The `vector` maps resource keys (`menuItem`, `media`, `language`, `user`) to Unix timestamps representing the last known change. Clients compare these values to decide whether to refetch.

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
