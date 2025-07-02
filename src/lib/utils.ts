import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Triggers haptic feedback on supported devices.
 * @param pattern The vibration pattern. Can be a single value or an array of values.
 */
export function triggerHapticFeedback(pattern: number | number[] = 50) {
  // Check if the window object and vibrate function exist
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.error("Haptic feedback failed:", error);
    }
  }
}
