import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type { UserRole } from '@live-menu/shared';
import type { AuthUser } from '../types';

// In-memory session cache (lives for the Worker isolate lifetime, typically ~30s)
const sessionCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const SESSION_CACHE_TTL = 60_000; // 60 seconds in ms
const SESSION_CACHE_MAX_SIZE = 1000;

export class AuthService {
  constructor(
    private db: D1Database,
    private rpName: string,
    private rpId: string,
    private origin: string
  ) {}

  /** Generate WebAuthn registration options */
  async generateRegistrationOptions(userId: number, userName: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const credentials = await this.db
      .prepare('SELECT credential_id FROM passkey_credentials WHERE user_id = ?')
      .bind(userId)
      .all<{ credential_id: string }>();

    const excludeCredentials = credentials.results.map((c) => ({
      id: c.credential_id,
      type: 'public-key' as const,
    }));

    const encoded = new TextEncoder().encode(userId.toString());
    const userIdBuffer = new Uint8Array(encoded.length);
    userIdBuffer.set(encoded);

    return generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: userIdBuffer,
      userName: userName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  /** Verify WebAuthn registration response */
  async verifyRegistrationResponse(
    userId: number,
    response: any,
    expectedChallenge: string
  ): Promise<VerifiedRegistrationResponse> {
    const p = verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
    });
    // Prevent workerd from treating synchronous throws as unhandled rejections;
    // callers must still await this method and handle the rejection themselves.
    p.catch(() => {});
    return p;
  }

  /** Save credential to database */
  async saveCredential(
    userId: number,
    credentialId: string,
    publicKey: Uint8Array,
    counter: number,
    deviceName?: string
  ) {
    // Encode Uint8Array as base64 for storage
    const publicKeyB64 = btoa(String.fromCharCode(...publicKey));
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare(
        `INSERT INTO passkey_credentials (credential_id, user_id, public_key, counter, device_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(credentialId, userId, publicKeyB64, counter, deviceName ?? null, now)
      .run();
  }

  /** Generate WebAuthn authentication options */
  async generateAuthenticationOptions(userId?: number) {
    let allowCredentials;

    if (userId) {
      const credentials = await this.db
        .prepare('SELECT credential_id FROM passkey_credentials WHERE user_id = ?')
        .bind(userId)
        .all<{ credential_id: string }>();

      allowCredentials = credentials.results.map((c) => ({
        id: c.credential_id,
        type: 'public-key' as const,
      }));
    }

    return generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });
  }

  /** Verify WebAuthn authentication response */
  async verifyAuthenticationResponse(
    response: any,
    expectedChallenge: string
  ): Promise<{ userId: number; verified: boolean }> {
    const credentialRecord = await this.db
      .prepare('SELECT * FROM passkey_credentials WHERE credential_id = ?')
      .bind(response.rawId)
      .first<{ user_id: number; public_key: string; counter: number }>();

    if (!credentialRecord) {
      throw new Error('Credential not found');
    }

    // Decode base64 public key back to Uint8Array
    const publicKeyBytes = Uint8Array.from(atob(credentialRecord.public_key), (c) => c.charCodeAt(0));

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      credential: {
        id: response.rawId,
        publicKey: publicKeyBytes,
        counter: credentialRecord.counter,
      },
    });

    if (verification.verified) {
      await this.db
        .prepare('UPDATE passkey_credentials SET counter = ? WHERE credential_id = ?')
        .bind(verification.authenticationInfo.newCounter, response.rawId)
        .run();
    }

    return {
      userId: credentialRecord.user_id,
      verified: verification.verified,
    };
  }

  /** Create session */
  async createSession(userId: number): Promise<string> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const sessionId = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 30 * 24 * 60 * 60; // 30 days

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(sessionId, userId, expiresAt, now)
      .run();

    return sessionId;
  }

  /** Validate session — checks cache first, then D1 */
  async validateSession(sessionId: string): Promise<AuthUser | null> {
    const cached = sessionCache.get(sessionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.user;
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await this.db
      .prepare(
        `SELECT u.id, u.name, u.role FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1`
      )
      .bind(sessionId, now)
      .first<AuthUser>();

    if (result) {
      sessionCache.set(sessionId, { user: result, expiresAt: Date.now() + SESSION_CACHE_TTL });

      if (sessionCache.size > SESSION_CACHE_MAX_SIZE) {
        const now = Date.now();
        for (const [key, value] of sessionCache) {
          if (now >= value.expiresAt) {
            sessionCache.delete(key);
          }
        }
        if (sessionCache.size > SESSION_CACHE_MAX_SIZE) {
          const entriesToDelete = sessionCache.size - SESSION_CACHE_MAX_SIZE;
          let deleted = 0;
          for (const key of sessionCache.keys()) {
            if (deleted >= entriesToDelete) break;
            sessionCache.delete(key);
            deleted++;
          }
        }
      }
    }

    return result ?? null;
  }

  /** Delete session */
  async deleteSession(sessionId: string) {
    sessionCache.delete(sessionId);
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionId)
      .run();
  }

  /** Create registration token and pre-create the user */
  async createRegistrationToken(
    createdBy: number,
    role: UserRole,
    preFilledName: string
  ): Promise<{ token: string; userId: number }> {
    const token = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 6 * 60 * 60; // 6 hours

    const existingUser = await this.db
      .prepare('SELECT id, has_passkey FROM users WHERE name = ?')
      .bind(preFilledName)
      .first<{ id: number; has_passkey: number }>();

    let userId: number;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = await this.createUser(preFilledName, role);
    }

    await this.db
      .prepare(
        `INSERT INTO registration_tokens (token, user_id, pre_filled_name, role, expires_at, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(token, userId, preFilledName, role, expiresAt, createdBy, now)
      .run();

    return { token, userId };
  }

  /** Validate registration token — must be unused and not expired */
  async validateRegistrationToken(token: string) {
    const now = Math.floor(Date.now() / 1000);

    const result = await this.db
      .prepare(
        'SELECT * FROM registration_tokens WHERE token = ? AND used_at IS NULL AND expires_at > ?'
      )
      .bind(token, now)
      .first<{
        token: string;
        user_id: number | null;
        pre_filled_name: string;
        role: UserRole;
        expires_at: number;
      }>();

    return result ?? null;
  }

  /** Mark registration token as used */
  async markTokenAsUsed(token: string) {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare('UPDATE registration_tokens SET used_at = ? WHERE token = ?')
      .bind(now, token)
      .run();
  }

  /** Mark user as registered (has passkey) */
  async markUserAsRegistered(userId: number) {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare('UPDATE users SET has_passkey = 1, updated_at = ? WHERE id = ?')
      .bind(now, userId)
      .run();
  }

  /** Count expired sessions */
  async getExpiredSessionCount(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at < ?')
      .bind(now)
      .first<{ count: number }>();
    return result?.count ?? 0;
  }

  /** Delete expired sessions, returns number deleted */
  async deleteExpiredSessions(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE expires_at < ?')
      .bind(now)
      .run();
    return result.meta.changes ?? 0;
  }

  /** Create user — no color column in this project */
  async createUser(name: string, role: UserRole): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.db
      .prepare(
        'INSERT INTO users (name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, 1, 0, ?, ?)'
      )
      .bind(name, role, now, now)
      .run();

    return result.meta.last_row_id as number;
  }

  /** Get user by ID */
  async getUserById(userId: number): Promise<AuthUser | null> {
    const result = await this.db
      .prepare('SELECT id, name, role FROM users WHERE id = ?')
      .bind(userId)
      .first<AuthUser>();

    return result ?? null;
  }
}
