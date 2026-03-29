import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toEntrySource(source: string | null | undefined): "MANUAL" | "SMART_ALERT" | undefined {
  if (!source) return undefined;

  // Convert common source names to proper enum values
  const normalized = source.toLowerCase().trim();

  // Smart alert sources should map to SMART_ALERT
  if (normalized.includes('alert') || normalized.includes('smart') || normalized.includes('auto')) {
    return "SMART_ALERT";
  }

  // Default to MANUAL for all other sources
  return "MANUAL";
}
