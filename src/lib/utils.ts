import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates text to a specified number of words, adding ellipsis if truncated
 * @param text - The text to truncate
 * @param maxWords - Maximum number of words to show (default: 6)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateWords(text: string | null | undefined, maxWords: number = 6): string {
  if (!text) return "";

  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }

  return words.slice(0, maxWords).join(" ") + "...";
}
