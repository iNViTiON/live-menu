import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export async function registerPasskey(options: Parameters<typeof startRegistration>[0]) {
  return await startRegistration(options);
}

export async function authenticatePasskey(options: Parameters<typeof startAuthentication>[0]) {
  return await startAuthentication(options);
}
