import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getCircleWallet } from "@/lib/circle/user-wallet.server";

const bodySchema = z.object({ userToken: z.string().min(1) });

export const Route = createFileRoute("/api/circle/wallet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userToken } = bodySchema.parse(await request.json());
          return Response.json(await getCircleWallet(userToken), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Circle wallet lookup failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json({ error: "Unable to load Circle wallet." }, { status: 400 });
        }
      },
    },
  },
});
