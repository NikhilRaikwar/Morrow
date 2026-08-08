import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  circleSessionCookie,
  clearCircleSessionCookie,
  openCircleSession,
  readCircleSessionCookie,
  sealCircleSession,
} from "@/lib/circle/session.server";
import { refreshSocialSession } from "@/lib/circle/user-wallet.server";

const bodySchema = z.object({
  userToken: z.string().min(1),
  refreshToken: z.string().min(1),
  deviceId: z.string().min(1),
});

const noStore = { "cache-control": "no-store" };

export const Route = createFileRoute("/api/circle/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const saved = await openCircleSession(readCircleSessionCookie(request));
        if (!saved) return Response.json({ authenticated: false }, { headers: noStore });
        try {
          const refreshed = await refreshSocialSession(saved);
          const sealed = await sealCircleSession({
            userToken: refreshed.userToken,
            refreshToken: refreshed.refreshToken,
            deviceId: saved.deviceId,
          });
          return Response.json(
            {
              authenticated: true,
              userToken: refreshed.userToken,
              encryptionKey: refreshed.encryptionKey,
            },
            {
              headers: {
                ...noStore,
                "set-cookie": circleSessionCookie(request, sealed),
              },
            },
          );
        } catch (error) {
          console.error("Circle session restore failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json(
            { authenticated: false },
            {
              headers: {
                ...noStore,
                "set-cookie": clearCircleSessionCookie(request),
              },
            },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const session = bodySchema.parse(await request.json());
          const sealed = await sealCircleSession(session);
          return Response.json(
            { saved: true },
            {
              headers: {
                ...noStore,
                "set-cookie": circleSessionCookie(request, sealed),
              },
            },
          );
        } catch (error) {
          console.error("Circle session persistence failed", {
            message: error instanceof Error ? error.message : "unknown",
          });
          return Response.json({ error: "Unable to save the Circle session." }, { status: 400 });
        }
      },
      DELETE: ({ request }) =>
        Response.json(
          { disconnected: true },
          {
            headers: {
              ...noStore,
              "set-cookie": clearCircleSessionCookie(request),
            },
          },
        ),
    },
  },
});
