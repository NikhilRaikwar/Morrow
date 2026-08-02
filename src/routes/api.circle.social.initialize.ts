import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { initializeSocialWallet } from "@/lib/circle/user-wallet.server";

export const Route = createFileRoute("/api/circle/social/initialize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userToken } = z
            .object({ userToken: z.string().min(1) })
            .parse(await request.json());
          return Response.json(await initializeSocialWallet(userToken), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Circle social wallet initialization failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json({ error: "Unable to initialize the Arc wallet." }, { status: 400 });
        }
      },
    },
  },
});
