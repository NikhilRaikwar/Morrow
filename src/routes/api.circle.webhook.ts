import { createPublicKey, verify } from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";

import { getCircleServerConfig } from "@/lib/circle/config.server";

type CircleNotification = {
  notificationId?: string;
  notificationType?: string;
  subscriptionId?: string;
};

const publicKeys = new Map<string, ReturnType<typeof createPublicKey>>();
const deliveredNotificationIds = new Set<string>();

async function circlePublicKey(keyId: string) {
  const cached = publicKeys.get(keyId);
  if (cached) return cached;

  const config = getCircleServerConfig();
  if (!config.configured) throw new Error("Circle is not configured.");

  const response = await fetch(`https://api.circle.com/v2/notifications/publicKey/${keyId}`, {
    headers: { accept: "application/json", authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) throw new Error(`Circle public-key lookup failed (${response.status}).`);

  const payload = (await response.json()) as { data?: { publicKey?: string } };
  if (!payload.data?.publicKey) throw new Error("Circle public-key response was incomplete.");

  const key = createPublicKey({
    key: Buffer.from(payload.data.publicKey, "base64"),
    format: "der",
    type: "spki",
  });
  publicKeys.set(keyId, key);
  return key;
}

export const Route = createFileRoute("/api/circle/webhook")({
  server: {
    handlers: {
      HEAD: () => new Response(null, { status: 204 }),
      POST: async ({ request }) => {
        const signature = request.headers.get("x-circle-signature");
        const keyId = request.headers.get("x-circle-key-id");
        if (!signature || !keyId)
          return new Response("Missing Circle signature headers", { status: 401 });

        const rawBody = await request.text();
        try {
          const key = await circlePublicKey(keyId);
          const valid = verify(
            "sha256",
            Buffer.from(rawBody),
            key,
            Buffer.from(signature, "base64"),
          );
          if (!valid) return new Response("Invalid Circle webhook signature", { status: 401 });

          const notification = JSON.parse(rawBody) as CircleNotification;
          const configuredId = process.env.CIRCLE_WEBHOOK_SUBSCRIPTION_ID;
          if (configuredId && notification.subscriptionId !== configuredId) {
            return new Response("Unexpected Circle subscription", { status: 403 });
          }

          // Circle may retry deliveries. In-memory dedupe is sufficient for the testnet MVP;
          // persisted idempotency is added with the production event store.
          if (
            notification.notificationId &&
            deliveredNotificationIds.has(notification.notificationId)
          ) {
            return new Response(null, { status: 204 });
          }
          if (notification.notificationId)
            deliveredNotificationIds.add(notification.notificationId);

          console.info("Verified Circle webhook", {
            notificationId: notification.notificationId,
            notificationType: notification.notificationType,
          });
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error("Circle webhook verification failed", error);
          return new Response("Webhook verification failed", { status: 401 });
        }
      },
    },
  },
});
