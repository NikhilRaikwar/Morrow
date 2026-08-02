import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  actionSchema,
  createMorrowChallenge,
  getCircleWallet,
} from "@/lib/circle/user-wallet.server";
const bodySchema = z.object({
  userToken: z.string().min(1),
  walletId: z.string().uuid(),
  intentId: z.string().uuid(),
  action: actionSchema,
});
export const Route = createFileRoute("/api/circle/challenge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = bodySchema.parse(await request.json());
          const wallet = await getCircleWallet(input.userToken);
          if (wallet.walletId !== input.walletId)
            return Response.json(
              { error: "Wallet does not belong to this session." },
              { status: 403 },
            );
          return Response.json(
            await createMorrowChallenge(
              input.userToken,
              wallet.walletId,
              input.action,
              input.intentId,
            ),
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
