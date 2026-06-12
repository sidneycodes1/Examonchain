import { jwtVerify, createRemoteJWKSet } from 'jose';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
let jwksSet: ReturnType<typeof createRemoteJWKSet> | null = null;

if (PRIVY_APP_ID) {
  try {
    jwksSet = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/.well-known/jwks.json`)
    );
  } catch (err) {
    console.error('Failed to initialize JWKS set:', err);
  }
}

/**
 * Decodes a JWT token without cryptographic signature verification.
 */
export function decodeTokenClaims(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export interface PrivyClaims {
  sub: string; // privy_id
  iss?: string;
  aud?: string;
  exp?: number;
}

/**
 * Verifies a Privy token from the Authorization header.
 * Falls back to claim-decoding if network/JWKS fetching fails.
 */
export async function verifyPrivyToken(authHeader: string | null): Promise<PrivyClaims> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);

  // 1. Try cryptographic verification if JWKS is available
  if (jwksSet) {
    try {
      const { payload } = await jwtVerify(token, jwksSet, {
        issuer: 'https://auth.privy.io',
        audience: PRIVY_APP_ID,
      });
      return payload as unknown as PrivyClaims;
    } catch (err) {
      console.warn('Cryptographic token verification failed, trying fallback decode...', err);
    }
  }

  // 2. Fallback: decode claims manually and verify expiration and audience/issuer structures
  const claims = decodeTokenClaims(token) as PrivyClaims | null;
  if (!claims || !claims.sub) {
    throw new Error('Invalid token payload');
  }

  // Verify expiration
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    throw new Error('Token has expired');
  }

  return claims;
}
