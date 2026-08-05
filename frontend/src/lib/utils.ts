import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString()
}

export function formatDate(value: unknown) {
  if (!value) return ""
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function shortId(value: unknown, head = 10, tail = 6) {
  const text = String(value ?? "").trim()
  return text.length > head + tail + 1
    ? `${text.slice(0, head)}…${text.slice(-tail)}`
    : text
}
