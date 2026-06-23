const STORAGE_KEY = "beenvoice:time-clock:last-client";

export function getLastTimeClockClientId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setLastTimeClockClientId(clientId: string): void {
  if (!clientId || typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, clientId);
}
