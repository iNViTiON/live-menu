import type { Page, CDPSession } from '@playwright/test';

export async function setupVirtualAuthenticator(
  page: Page,
): Promise<{ cdpSession: CDPSession; authenticatorId: string }> {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('WebAuthn.enable');
  const { authenticatorId } = await cdpSession.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    },
  );
  return { cdpSession, authenticatorId };
}

export async function removeVirtualAuthenticator(
  cdpSession: CDPSession,
  authenticatorId: string,
): Promise<void> {
  await cdpSession.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId,
  });
  await cdpSession.send('WebAuthn.disable');
}
