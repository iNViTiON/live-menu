import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Settings CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  it('GET /api/settings returns 401 without auth', async () => {
    const res = await SELF.fetch('http://localhost/api/settings');
    expect(res.status).toBe(401);
  });

  it('GET /api/settings returns settings list', async () => {
    const res = await SELF.fetch('http://localhost/api/settings', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const settings = await res.json<Record<string, string>>();
    expect(typeof settings).toBe('object');
  });

  it('PUT /api/settings/:key sets a value', async () => {
    const res = await SELF.fetch('http://localhost/api/settings/currency', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'EUR' }),
    });
    expect(res.status).toBe(200);
    const setting = await res.json<{ key: string; value: string }>();
    expect(setting.key).toBe('currency');
    expect(setting.value).toBe('EUR');
  });

  it('PUT /api/settings/:key updates an existing value', async () => {
    // Set initial value
    await SELF.fetch('http://localhost/api/settings/currency', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'USD' }),
    });

    // Update value
    const res = await SELF.fetch('http://localhost/api/settings/currency', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'GBP' }),
    });
    expect(res.status).toBe(200);
    const setting = await res.json<{ key: string; value: string }>();
    expect(setting.value).toBe('GBP');
  });

  it('PUT /api/settings/:key returns 400 for missing value', async () => {
    const res = await SELF.fetch('http://localhost/api/settings/currency', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/settings/:key returns 401 without auth', async () => {
    const res = await SELF.fetch('http://localhost/api/settings/currency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'EUR' }),
    });
    expect(res.status).toBe(401);
  });

  it('PUT /api/settings/:key works for staff', async () => {
    const res = await SELF.fetch('http://localhost/api/settings/show_prices', {
      method: 'PUT',
      headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'true' }),
    });
    expect(res.status).toBe(200);
    const setting = await res.json<{ key: string; value: string }>();
    expect(setting.key).toBe('show_prices');
    expect(setting.value).toBe('true');
  });

  it('GET /api/settings returns newly set values', async () => {
    // Set a distinct value
    await SELF.fetch('http://localhost/api/settings/test_key', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'test_value' }),
    });

    const res = await SELF.fetch('http://localhost/api/settings', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const settings = await res.json<Record<string, string>>();
    expect(settings['test_key']).toBe('test_value');
  });
});
