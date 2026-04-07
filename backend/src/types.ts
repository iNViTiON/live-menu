import type { UserRole } from '@live-menu/shared';
import type { AuthService } from './services/auth';
import type { VersionVectorService } from './services/version-vector';

export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  BROADCAST_ROOM: DurableObjectNamespace;
  FRONTEND_URL: string;
  ADMIN_URL: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_RP_NAME: string;
  WEBAUTHN_ORIGIN: string;
}

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    authService: AuthService;
    versionVectorService: VersionVectorService;
  };
};
