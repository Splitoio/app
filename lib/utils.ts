import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns relative time like "2h ago", "2 days ago" */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "1 day ago";
  if (day < 7) return `${day} days ago`;
  const week = Math.floor(day / 7);
  if (week === 1) return "1 week ago";
  if (week < 4) return `${week} weeks ago`;
  const month = Math.floor(day / 30);
  if (month === 1) return "1 month ago";
  if (month < 12) return `${month} months ago`;
  const year = Math.floor(day / 365);
  return year === 1 ? "1 year ago" : `${year} years ago`;
}
