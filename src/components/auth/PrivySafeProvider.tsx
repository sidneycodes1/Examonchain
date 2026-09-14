'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Client-only bridge over Privy's `usePrivy` hook.
 *
 * Why this exists: `@privy-io/react-auth` (via viem/ox) uses dynamic
 * `require()` expressions that Next 14's server bundler cannot statically
 * analyze. Any static top-level `import ... from '@privy-io/react-auth'`
 * risks pulling that chain into the server bundle. This module is the ONLY
 * place that references the Privy SDK at runtime, and it does so via a
 * client-only dynamic `import()` inside `useEffect`, so the server bundle
 * never sees it.
 *
 * Pattern: a hidden `Caller` component (mounted only after the dynamic
 * import resolves on the client) calls the real `usePrivy()` hook
 * unconditionally inside its own body — hook rules stay intact — and pushes
 * snapshots up into this context. Consumers use `usePrivySafe()`, a plain
 * context read with zero Privy imports.
 */

export interface PrivySafeApi {
  ready: boolean;
  authenticated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  getAccessToken: () => Promise<string | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  login: (...args: any[]) => void;
  logout: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkWallet: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unlinkWallet: (...args: any[]) => Promise<void> | void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectWallet: (...args: any[]) => void;
}

const loadingApi: PrivySafeApi = {
  ready: false,
  authenticated: false,
  user: null,
  getAccessToken: async () => null,
  login: () => {},
  logout: async () => {},
  linkWallet: () => {},
  unlinkWallet: async () => {},
  connectWallet: () => {},
};

const PrivySafeContext = createContext<PrivySafeApi>(loadingApi);

export function usePrivySafe(): PrivySafeApi {
  return useContext(PrivySafeContext);
}

export default function PrivySafeProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<PrivySafeApi>(loadingApi);
  const [Caller, setCaller] = useState<React.ComponentType<{
    onSnapshot: (next: PrivySafeApi) => void;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@privy-io/react-auth')
      .then((mod) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usePrivy = (mod as any).usePrivy;
        if (typeof usePrivy !== 'function') {
          console.error('Privy SDK loaded but usePrivy is missing');
          return;
        }
        setCaller(() => function PrivyHookCaller({
          onSnapshot,
        }: {
          onSnapshot: (next: PrivySafeApi) => void;
        }) {
          // Hook called unconditionally in this component's body: rules-safe.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const privy: any = usePrivy();
          const fnsRef = useRef(privy);
          fnsRef.current = privy;
          const { ready, authenticated, user } = privy;
          useEffect(() => {
            const p = fnsRef.current;
            onSnapshot({
              ready: !!ready,
              authenticated: !!authenticated,
              user: user ?? null,
              getAccessToken: p.getAccessToken ?? (async () => null),
              login: p.login ?? (() => {}),
              logout: p.logout ?? (async () => {}),
              linkWallet: p.linkWallet ?? (() => {}),
              unlinkWallet: p.unlinkWallet ?? (async () => {}),
              connectWallet: p.connectWallet ?? (() => {}),
            });
            // Only re-snapshot when identity-relevant state changes; function
            // refs are read fresh via fnsRef to avoid effect churn.
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [ready, authenticated, user, onSnapshot]);
          return null;
        });
      })
      .catch((err) => {
        console.error('Failed to load Privy SDK:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSnapshot = useCallback((next: PrivySafeApi) => {
    setApi((prev) => {
      if (
        prev.ready === next.ready &&
        prev.authenticated === next.authenticated &&
        prev.user === next.user &&
        prev.getAccessToken === next.getAccessToken &&
        prev.login === next.login &&
        prev.logout === next.logout
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  return (
    <PrivySafeContext.Provider value={api}>
      {Caller ? <Caller onSnapshot={handleSnapshot} /> : null}
      {children}
    </PrivySafeContext.Provider>
  );
}
