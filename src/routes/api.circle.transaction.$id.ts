import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getCircleTransaction } from "@/lib/circle/user-wallet.server";

export const Route = createFileRoute("/api/circle/transaction/$id")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { userToken } = z
            .object({ userToken: z.string().min(1) })
            .parse(await request.json());
          return Response.json(await getCircleTransaction(userToken, params.id), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Circle transaction lookup failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json({ error: "Unable to load Circle transaction." }, { status: 400 });
        }
      },
    },
  },
});
