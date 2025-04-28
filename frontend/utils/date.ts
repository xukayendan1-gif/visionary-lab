import { format, formatDistanceToNow } from "date-fns"

/**
 * Format a date string or timestamp to a readable format
 * @param date - Date string, timestamp, or Date object
 * @param formatStr - Optional format string for date-fns
 * @returns Formatted date string
 */
export function formatDate(date: string | number | Date, formatStr = "PPp") {
  if (!date) return "N/A"
  
  const dateObj = typeof date === "string" || typeof date === "number" 
    ? new Date(date) 
    : date
    
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return "Invalid date"
  
  return format(dateObj, formatStr)
}

/**
 * Format a date as a relative time (e.g., "2 hours ago")
 * @param date - Date string, timestamp, or Date object
 * @returns Relative time string
 */
export function formatRelativeDate(date: string | number | Date) {
  if (!date) return "N/A"
  
  const dateObj = typeof date === "string" || typeof date === "number" 
    ? new Date(date) 
    : date
    
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return "Invalid date"
  
  return formatDistanceToNow(dateObj, { addSuffix: true })
} 