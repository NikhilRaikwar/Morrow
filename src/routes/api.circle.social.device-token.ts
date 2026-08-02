import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createSocialDeviceToken } from "@/lib/circle/user-wallet.server";

export const Route = createFileRoute("/api/circle/social/device-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { deviceId } = z
            .object({ deviceId: z.string().min(1).max(512) })
            .parse(await request.json());
          return Response.json(await createSocialDeviceToken(deviceId), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Circle social device token failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json({ error: "Unable to prepare Google sign-in." }, { status: 400 });
        }
      },
    },
  },
});
