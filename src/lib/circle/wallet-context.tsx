import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { MorrowCircleAction } from "./user-wallet.server";

export type OperationState =
  "idle" | "preparing" | "awaiting_approval" | "submitted" | "confirmed" | "failed" | "cancelled";

type WalletSession = {
  userId: string;
  userToken: string;
  encryptionKey: string;
  walletId: string;
  address: string;
  balances: unknown[];
};

type StartResponse = Omit<WalletSession, "walletId" | "address" | "balances"> & {
  appId: string;
  walletId?: string;
  address?: string;
  challengeId?: string;
};
type ChallengeExecutionResult = { data?: { transactionHash?: string; txHash?: string } };

type CircleWalletContextValue = {
  session: WalletSession | null;
  operationState: OperationState;
  error: string | null;
  connect: (userId: string) => Promise<WalletSession>;
  refresh: () => Promise<WalletSession | null>;
  execute: (action: MorrowCircleAction) => Promise<{ txHash?: string }>;
  disconnect: () => void;
};

const CircleWalletContext = createContext<CircleWalletContextValue | null>(null);

async function json<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Circle request failed.");
  return payload;
}

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const sdk = useRef<W3SSdk | null>(null);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [operationState, setOperationState] = useState<OperationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const executeChallenge = useCallback(async (challengeId: string) => {
    const instance = sdk.current;
    if (!instance) throw new Error("Circle approval SDK is not ready.");
    return new Promise<unknown>((resolve, reject) => {
      instance.execute(challengeId, (challengeError, result) => {
        if (challengeError) return reject(challengeError);
        if (result?.status === "FAILED" || result?.status === "EXPIRED") {
          return reject(new Error("Circle challenge was not completed."));
        }
        resolve(result);
      });
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return null;
    const wallet = await json<{ walletId: string; address: string; balances: unknown[] }>(
      "/api/circle/wallet",
      { userToken: session.userToken },
    );
    const next = { ...session, ...wallet };
    setSession(next);
    return next;
  }, [session]);

  const connect = useCallback(
    async (userId: string) => {
      setError(null);
      setOperationState("preparing");
      try {
        const started = await json<StartResponse>("/api/circle/session/start", { userId });
        const instance = new W3SSdk({ appSettings: { appId: started.appId } });
        instance.setAuthentication({
          userToken: started.userToken,
          encryptionKey: started.encryptionKey,
        });
        sdk.current = instance;
        if (started.challengeId) {
          setOperationState("awaiting_approval");
          await executeChallenge(started.challengeId);
        }
        const wallet = await json<{ walletId: string; address: string; balances: unknown[] }>(
          "/api/circle/wallet",
          { userToken: started.userToken },
        );
        const next = {
          userId: started.userId,
          userToken: started.userToken,
          encryptionKey: started.encryptionKey,
          ...wallet,
        };
        setSession(next);
        setOperationState("confirmed");
        return next;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to connect Circle Wallet.";
        setError(message);
        setOperationState("failed");
        throw cause;
      }
    },
    [executeChallenge],
  );

  const execute = useCallback(
    async (action: MorrowCircleAction) => {
      if (!session) throw new Error("Connect a Circle wallet first.");
      setError(null);
      setOperationState("preparing");
      try {
        const challenge = await json<{ challengeId: string }>("/api/circle/challenge", {
          userToken: session.userToken,
          walletId: session.walletId,
          action,
        });
        setOperationState("awaiting_approval");
        const result = (await executeChallenge(challenge.challengeId)) as ChallengeExecutionResult;
        setOperationState("submitted");
        await refresh();
        setOperationState("confirmed");
        return { txHash: result?.data?.transactionHash ?? result?.data?.txHash };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Circle transaction was not completed.";
        setError(message);
        setOperationState("failed");
        throw cause;
      }
    },
    [executeChallenge, refresh, session],
  );

  const value = useMemo<CircleWalletContextValue>(
    () => ({
      session,
      operationState,
      error,
      connect,
      refresh,
      execute,
      disconnect: () => {
        sdk.current = null;
        setSession(null);
        setOperationState("idle");
        setError(null);
      },
    }),
    [connect, error, execute, operationState, refresh, session],
  );

  return <CircleWalletContext.Provider value={value}>{children}</CircleWalletContext.Provider>;
}

export function useCircleWallet() {
  const context = useContext(CircleWalletContext);
  if (!context) throw new Error("useCircleWallet must be used inside CircleWalletProvider");
  return context;
}
