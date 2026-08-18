import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function hashIndex(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % Math.max(1, len);
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Deterministic muted tone pairs for avatars and skill chips. */
export const TONES: { bg: string; fg: string }[] = [
  { bg: "#dcebe4", fg: "#15594b" },
  { bg: "#f7e8d4", fg: "#92400e" },
  { bg: "#dfe7f2", fg: "#33517a" },
  { bg: "#eadff0", fg: "#6b4a80" },
  { bg: "#d9ecef", fg: "#155e6b" },
  { bg: "#f0e2e0", fg: "#8a4a3f" },
  { bg: "#e5ecd6", fg: "#4c6524" },
  { bg: "#e2e2f0", fg: "#4a4a80" },
];

export function toneFor(key: string) {
  return TONES[hashIndex(key, TONES.length)];
}
