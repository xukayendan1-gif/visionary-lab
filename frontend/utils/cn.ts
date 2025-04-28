import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class values into a single className string,
 * and ensures Tailwind classes are properly merged without conflicts
 * 
 * @param inputs - Class values to be merged together
 * @returns A className string with resolved Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 