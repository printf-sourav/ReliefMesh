import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function date(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: undefined }).format(new Date(value)); }
export function timeZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
export function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please retry.'; }
