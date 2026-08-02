import { createFileRoute } from "@tanstack/react-router";
import { getCirclePublicConfig } from "@/lib/circle/config.server";

export const Route = createFileRoute("/api/circle/social/config")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(getCirclePublicConfig(), {
          headers: { "cache-control": "no-store" },
        }),
    },
  },
});
