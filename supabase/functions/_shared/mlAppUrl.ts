// Callback destinations must be the panel, never another function endpoint.
export const DEFAULT_ML_APP_URL = "https://ecomperegrinus.com.br";

const PANEL_HOSTS = new Set([
  "ecomperegrinus.com.br",
  "www.ecomperegrinus.com.br",
  "peregrinus-com-br.lovable.app",
  "id-preview--7329b989-d6a8-4368-85a5-a45d0c663e64.lovable.app",
]);

export function resolveMlAppUrl(configured?: string): string {
  try {
    const url = new URL(configured ?? "");
    if (url.protocol !== "https:" || url.username || url.password || !PANEL_HOSTS.has(url.hostname) || url.port) {
      return DEFAULT_ML_APP_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_ML_APP_URL;
  }
}