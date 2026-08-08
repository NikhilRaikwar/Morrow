import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import {
  SocialLoginProvider,
  type SocialLoginResult,
} from "@circle-fin/w3s-pw-web-sdk/dist/src/types";
import { useNavigate } from "@tanstack/react-router";
import { Buffer } from "vite-plugin-node-polyfills/shims/buffer";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MorrowCircleAction } from "./user-wallet.server";

export type CircleSessionStatus =
  "loading" | "disconnected" | "onboarding" | "connected" | "expired" | "error";
export type OperationState =
  | "idle"
  | "preparing"
  | "awaiting_approval"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed"
  | "cancelled";
type WalletSession = {
  userToken: string;
  encryptionKey: string;
  walletId: string;
  address: string;
  balances: unknown[];
  provider: "Google";
};
type SocialConfig = { configured: true; appId: string; googleClientId: string };
type Context = {
  session: WalletSession | null;
  sessionStatus: CircleSessionStatus;
  operationState: OperationState;
  error: string | null;
  connect: (next?: string) => Promise<void>;
  refresh: () => Promise<WalletSession | null>;
  execute: (
    action: MorrowCircleAction,
  ) => Promise<{ txHash?: string; challengeId?: string; transactionId?: string }>;
  disconnect: () => void;
};

const DEVICE_SESSION_KEY = "morrow_circle_social_device";
const DEVICE_ID_KEY = "morrow_circle_device_id";
const NEXT_ROUTE_KEY = "morrow_circle_next_route";
const CircleWalletContext = createContext<Context | null>(null);

async function request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Circle request failed.");
  return payload;
}

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/business";
}

function errorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  if (typeof cause === "string" && cause.trim()) return cause;
  if (cause && typeof cause === "object" && "message" in cause) {
    const message = (cause as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const sdk = useRef<W3SSdk | null>(null);
  const config = useRef<SocialConfig | null>(null);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CircleSessionStatus>("loading");
  const [operationState, setOperationState] = useState<OperationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(async (challengeId: string) => {
    if (!sdk.current) throw new Error("Circle approval SDK is not ready.");
    return new Promise<unknown>((resolve, reject) =>
      sdk.current!.execute(challengeId, (challengeError, result) => {
        if (challengeError) return reject(new Error(challengeError.message));
        if (result?.status === "FAILED") return reject(new Error("Circle challenge failed."));
        if (result?.status === "EXPIRED") return reject(new Error("Circle challenge expired."));
        resolve(result);
      }),
    );
  }, []);

  const loadWallet = useCallback(async (userToken: string, encryptionKey: string, attempts = 1) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const wallet = await request<{
          walletId: string;
          address: string;
          balances: unknown[];
        }>("/api/circle/wallet", "POST", { userToken });
        const next: WalletSession = {
          userToken,
          encryptionKey,
          ...wallet,
          provider: "Google",
        };
        setSession(next);
        setSessionStatus("connected");
        return next;
      } catch (cause) {
        lastError = cause;
        if (attempt + 1 < attempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_500));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to load Circle wallet.");
  }, []);

  const completeSocialLogin = useCallback(
    async (result: SocialLoginResult) => {
      try {
        setError(null);
        setSessionStatus("onboarding");
        setOperationState("preparing");
        sdk.current?.setAuthentication({
          userToken: result.userToken,
          encryptionKey: result.encryptionKey,
        });
        const initialized = await request<{ challengeId?: string }>(
          "/api/circle/social/initialize",
          "POST",
          { userToken: result.userToken },
        );
        if (initialized.challengeId) {
          setOperationState("awaiting_approval");
          await approve(initialized.challengeId);
          setOperationState("confirming");
        }
        // Circle may need a few seconds to index a newly created wallet after
        // the hosted challenge completes. Returning users normally succeed on
        // the first read; new users get a bounded retry window.
        await loadWallet(result.userToken, result.encryptionKey, initialized.challengeId ? 7 : 1);
        setOperationState("confirmed");
        sessionStorage.removeItem(DEVICE_SESSION_KEY);
        const destination = safeNext(sessionStorage.getItem(NEXT_ROUTE_KEY));
        sessionStorage.removeItem(NEXT_ROUTE_KEY);
        await navigate({ to: destination as "/dashboard/business", replace: true });
      } catch (cause) {
        const message = errorMessage(cause, "Unable to finish Google sign-in.");
        setError(message);
        setSessionStatus("error");
        setOperationState("failed");
        const destination = safeNext(sessionStorage.getItem(NEXT_ROUTE_KEY));
        await navigate({
          to: "/connect",
          search: { next: destination },
          replace: true,
        });
      }
    },
    [approve, loadWallet, navigate],
  );

  const configure = useCallback(
    async (
      publicConfig: SocialConfig,
      device?: { deviceToken: string; deviceEncryptionKey: string },
    ) => {
      (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer ??= Buffer;
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const instance = new W3SSdk(
        {
          appSettings: { appId: publicConfig.appId },
          loginConfigs: {
            deviceToken: device?.deviceToken ?? "",
            deviceEncryptionKey: device?.deviceEncryptionKey ?? "",
            google: {
              clientId: publicConfig.googleClientId,
              redirectUri: window.location.origin,
              selectAccountPrompt: true,
            },
          },
        },
        (loginError, result) => {
          if (loginError) {
            setError(loginError.message);
            setSessionStatus("error");
            setOperationState("failed");
          } else if (result && "oAuthInfo" in result) {
            void completeSocialLogin(result);
          }
        },
      );
      sdk.current = instance;
    },
    [completeSocialLogin],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const publicConfig = await request<SocialConfig | { configured: false }>(
          "/api/circle/social/config",
          "GET",
        );
        if (!publicConfig.configured) throw new Error("Circle Google login is not configured.");
        config.current = publicConfig;
        const saved = sessionStorage.getItem(DEVICE_SESSION_KEY);
        const device = saved
          ? (JSON.parse(saved) as { deviceToken: string; deviceEncryptionKey: string })
          : undefined;
        await configure(publicConfig, device);
        if (!cancelled) setSessionStatus("disconnected");
      } catch (cause) {
        if (cancelled) return;
        setError(errorMessage(cause, "Unable to initialize Circle login."));
        setSessionStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configure]);

  const connect = useCallback(async (next = "/dashboard/business") => {
    if (!sdk.current || !config.current) throw new Error("Circle Google login is not ready.");
    setError(null);
    setSessionStatus("onboarding");
    setOperationState("preparing");
    try {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = await sdk.current.getDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      const device = await request<{ deviceToken: string; deviceEncryptionKey: string }>(
        "/api/circle/social/device-token",
        "POST",
        { deviceId },
      );
      sessionStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(device));
      sessionStorage.setItem(NEXT_ROUTE_KEY, safeNext(next));
      sdk.current.updateConfigs({
        appSettings: { appId: config.current.appId },
        loginConfigs: {
          ...device,
          google: {
            clientId: config.current.googleClientId,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      });
      await sdk.current.performLogin(SocialLoginProvider.GOOGLE);
    } catch (cause) {
      const message = errorMessage(cause, "Unable to start Google login.");
      setError(message);
      setSessionStatus("error");
      setOperationState("failed");
      throw cause;
    }
  }, []);

  const refresh = useCallback(
    async () => (session ? loadWallet(session.userToken, session.encryptionKey) : null),
    [loadWallet, session],
  );

  const execute = useCallback(
    async (action: MorrowCircleAction) => {
      if (!session) throw new Error("Sign in with Google first.");
      setError(null);
      setOperationState("preparing");
      try {
        const challenge = await request<{ challengeId: string }>("/api/circle/challenge", "POST", {
          userToken: session.userToken,
          walletId: session.walletId,
          intentId: crypto.randomUUID(),
          action,
        });
        setOperationState("awaiting_approval");
        const result = (await approve(challenge.challengeId)) as {
          data?: { transactionHash?: string; txHash?: string; transactionId?: string; id?: string };
        };
        setOperationState("confirming");
        await refresh();
        setOperationState("confirmed");
        return {
          challengeId: challenge.challengeId,
          transactionId: result.data?.transactionId ?? result.data?.id,
          txHash: result.data?.transactionHash ?? result.data?.txHash,
        };
      } catch (cause) {
        const message = errorMessage(cause, "Circle transaction was not completed.");
        setError(message);
        setOperationState(message.toLowerCase().includes("cancel") ? "cancelled" : "failed");
        throw cause;
      }
    },
    [approve, refresh, session],
  );

  const disconnect = useCallback(() => {
    sdk.current = null;
    sessionStorage.removeItem(DEVICE_SESSION_KEY);
    sessionStorage.removeItem(NEXT_ROUTE_KEY);
    setSession(null);
    setSessionStatus("disconnected");
    setOperationState("idle");
    setError(null);
    if (config.current) void configure(config.current);
  }, [configure]);

  const value = useMemo<Context>(
    () => ({
      session,
      sessionStatus,
      operationState,
      error,
      connect,
      refresh,
      execute,
      disconnect,
    }),
    [session, sessionStatus, operationState, error, connect, refresh, execute, disconnect],
  );
  return <CircleWalletContext.Provider value={value}>{children}</CircleWalletContext.Provider>;
}

export function useCircleWallet() {
  const context = useContext(CircleWalletContext);
  if (!context) throw new Error("useCircleWallet must be used inside CircleWalletProvider");
  return context;
}
