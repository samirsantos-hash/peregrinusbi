// Callback destinations must be the panel, never another function endpoint.
// APP_URL is required: an empty or untrusted value returns null so the
// callback shows a readable error page instead of redirecting.
const PANEL_HOSTS = new Set([
  "ecomperegrinus.com.br",
  "www.ecomperegrinus.com.br",
  "peregrinus-com-br.lovable.app",
  "id-preview--7329b989-d6a8-4368-85a5-a45d0c663e64.lovable.app",
]);

export function resolveMlAppUrl(configured?: string): string | null {
  try {
    const url = new URL(configured ?? "");
    if (url.protocol !== "https:" || url.username || url.password || !PANEL_HOSTS.has(url.hostname) || url.port) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
