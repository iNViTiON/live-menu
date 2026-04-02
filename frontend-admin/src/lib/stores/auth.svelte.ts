import type { User } from '@live-menu/shared';
import { api } from '$lib/api/client';
import { registerPasskey, authenticatePasskey } from '$lib/services/webauthn';
import { browser } from '$app/environment';

class AuthStore {
  user = $state<User | null>(null);
  token = $state<string | null>(null);
  isLoading = $state(true);

  constructor() {
    if (browser) {
      this.init();
    } else {
      this.isLoading = false;
    }
  }

  async init() {
    if (!browser) return;

    const storedToken = localStorage.getItem('auth_token');

    if (storedToken) {
      this.token = storedToken;

      try {
        const user = await api.get<User>('/api/auth/me');
        this.user = user;
      } catch (error) {
        console.error('Failed to validate session:', error);
        this.logout();
      }
    }

    this.isLoading = false;
  }

  async register(token: string, name: string, deviceName?: string): Promise<void> {
    const { options, userId, challengeId } = await api.post<{
      options: Parameters<typeof registerPasskey>[0];
      userId: number;
      challengeId: string;
    }>('/api/auth/register/challenge', { token });

    const credential = await registerPasskey(options);

    const response = await api.post<{ user: User; token: string }>(
      '/api/auth/register/verify',
      { userId, response: credential, challengeId, token, deviceName }
    );

    this.user = response.user;
    this.token = response.token;
    if (browser) {
      localStorage.setItem('auth_token', response.token);
    }
  }

  async login(): Promise<void> {
    const { options, challengeId } = await api.post<{
      options: Parameters<typeof authenticatePasskey>[0];
      challengeId: string;
    }>('/api/auth/login/challenge', {});

    const credential = await authenticatePasskey(options);

    const response = await api.post<{ user: User; token: string }>(
      '/api/auth/login/verify',
      { response: credential, challengeId }
    );

    this.user = response.user;
    this.token = response.token;
    if (browser) {
      localStorage.setItem('auth_token', response.token);
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    this.user = null;
    this.token = null;
    if (browser) {
      localStorage.removeItem('auth_token');
    }
  }

  get isAuthenticated() {
    return !!this.user;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }
}

export const authStore = new AuthStore();
