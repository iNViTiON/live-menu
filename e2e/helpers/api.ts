const BASE_URL = 'http://localhost:8787';

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
}

export async function authenticatedRequest(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return apiRequest(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

export async function authenticatedJson<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await authenticatedRequest(path, token, options);
  return res.json() as Promise<T>;
}

/** Delete all menu items via API (cleanup helper) */
export async function cleanupMenuItems(token: string): Promise<void> {
  const items = await authenticatedJson<{ id: number }[]>(
    '/api/menu-items',
    token,
  );
  for (const item of items) {
    await authenticatedRequest(`/api/menu-items/${item.id}`, token, {
      method: 'DELETE',
    });
  }
}

/** Delete non-base languages via API (cleanup helper) */
export async function cleanupLanguages(token: string): Promise<void> {
  const languages = await authenticatedJson<{ code: string; is_base: boolean }[]>(
    '/api/languages',
    token,
  );
  for (const lang of languages) {
    if (!lang.is_base) {
      await authenticatedRequest(`/api/languages/${lang.code}`, token, {
        method: 'DELETE',
      });
    }
  }
}

// Minimal 1x1 pixel PNG for upload tests
export const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==',
  'base64',
);
