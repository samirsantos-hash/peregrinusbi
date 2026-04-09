import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getEdgeFunctionErrorMessage(error: unknown, fallback = "Falha ao executar a ação") {
  if (!error || typeof error !== "object") return fallback;

  const candidate = error as { message?: string; context?: Response };

  if (candidate.context) {
    try {
      const payload = await candidate.context.clone().json() as { error?: string; message?: string };
      if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
      if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
    } catch {
      // ignore json parse errors
    }

    try {
      const text = await candidate.context.clone().text();
      if (text.trim()) return text;
    } catch {
      // ignore text parse errors
    }
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  return fallback;
}
