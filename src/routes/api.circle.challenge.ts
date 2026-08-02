import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { actionSchema, createMorrowChallenge } from "@/lib/circle/user-wallet.server";

const bodySchema = z.object({
  userToken: z.string().min(1),
  walletId: z.string().uuid(),
  action: actionSchema,
});

export const Route = createFileRoute("/api/circle/challenge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = bodySchema.parse(await request.json());
          return Response.json(
            await createMorrowChallenge(input.userToken, input.walletId, input.action),
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("Circle contract challenge failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json(
            { error: "Unable to create wallet approval challenge." },
            { status: 400 },
          );
        }
      },
    },
  },
});
