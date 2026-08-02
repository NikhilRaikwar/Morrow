/** Circle secrets stay server-only; do not import this module in browser components. */
export function getCircleServerConfig() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const appId = process.env.CIRCLE_APP_ID;
  const googleClientId = process.env.CIRCLE_GOOGLE_CLIENT_ID;
  return apiKey && appId && googleClientId
    ? { configured: true as const, apiKey, appId, googleClientId }
    : { configured: false as const };
}

export function getCirclePublicConfig() {
  const config = getCircleServerConfig();
  return config.configured
    ? { configured: true as const, appId: config.appId, googleClientId: config.googleClientId }
    : config;
}
