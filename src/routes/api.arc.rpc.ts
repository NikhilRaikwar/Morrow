import { createFileRoute } from "@tanstack/react-router";
import { ARC_TESTNET_RPC_URL } from "@/config/arc";

const FORBIDDEN = new Set([
  "eth_accounts",
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "personal_sign",
]);

export const Route = createFileRoute("/api/arc/rpc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 100_000)
          return Response.json({ error: "RPC request too large." }, { status: 413 });
        try {
          const payload = JSON.parse(raw) as { method?: string };
          if (!payload.method?.startsWith("eth_") || FORBIDDEN.has(payload.method)) {
            return Response.json({ error: "RPC method is not allowed." }, { status: 403 });
          }
          const upstream = await fetch(process.env.VITE_ARC_RPC_URL ?? ARC_TESTNET_RPC_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: raw,
          });
          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch {
          return Response.json({ error: "Invalid RPC request." }, { status: 400 });
        }
      },
    },
  },
});
