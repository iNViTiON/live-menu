export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { isFormData?: boolean } = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !options.isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { isFormData: _isFormData, ...fetchOptions } = options;

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
  upload: async <T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return apiRequest<T>(endpoint, { method: 'POST', body: formData, isFormData: true });
  },
};
