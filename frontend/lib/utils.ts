import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) => `KSh ${Number(value || 0).toLocaleString()}`

export const formatDate = (date: string | Date | number) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

export const formatMAC = (mac: string) => {
  if (!mac) return "";
  // Normalize MAC address to standard format XX:XX:XX:XX:XX:XX
  return mac.replace(/[^a-fA-F0-9]/g, '').match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
};
