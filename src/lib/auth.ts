import { createRemoteJWKSet, jwtVerify } from 'jose';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const JWKS_URL = `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

export interface PrivyClaims {
  sub: string;
  userId: string;
}

export async function verifyPrivyToken(authHeader: string | null): Promise<PrivyClaims> {  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: 'privy.io',
      audience: PRIVY_APP_ID,
    });

    if (!payload.sub) {
      throw new Error('Missing sub claim in token');
    }

    return {
      userId: payload.sub,
      sub: payload.sub,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/** Auth failures (missing/malformed/expired Privy JWT) should surface as 401, not 500. */
export function isAuthErrorMessage(message: string): boolean {
  return (
    message === 'Missing or invalid Authorization header' ||
    message === 'Invalid or expired token'
  );
}
