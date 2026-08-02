import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { beginCircleWallet } from "@/lib/circle/user-wallet.server";
import { getCircleServerConfig } from "@/lib/circle/config.server";

const bodySchema = z.object({ userId: z.string().trim().min(5).max(160) });

export const Route = createFileRoute("/api/circle/session/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = bodySchema.parse(await request.json());
          const session = await beginCircleWallet(input.userId);
          const config = getCircleServerConfig();
          if (!config.configured) throw new Error("Circle is not configured.");
          return Response.json(
            { ...session, appId: config.appId },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("Circle wallet session start failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json(
            { error: "Unable to start Circle wallet session." },
            { status: 400 },
          );
        }
      },
    },
  },
});
