import type { Draft } from './api-types';
export function createReportId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // LAN HTTP browser previews may lack randomUUID, but support secure random bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validateDraft(draft: Draft) {
  if (!draft.original_text.trim()) throw new Error('Describe what happened.');
  if (!draft.location.trim()) throw new Error('Add a location people can recognize.');
  if (!draft.image.size) throw new Error('Add an incident photo.');
  if (draft.latitude !== null && (!Number.isFinite(draft.latitude) || Math.abs(draft.latitude) > 90)) throw new Error('Latitude must be between −90 and 90.');
  if (draft.longitude !== null && (!Number.isFinite(draft.longitude) || Math.abs(draft.longitude) > 180)) throw new Error('Longitude must be between −180 and 180.');
}
export async function validateImage(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('The photo must be 10 MB or smaller.');
  if (!file.size) throw new Error('The photo is empty.');
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve,reject) => { const image = new Image(); image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error('The photo cannot be decoded.')); image.onerror = () => reject(new Error('The photo cannot be decoded.')); image.src = url; });
  } finally { URL.revokeObjectURL(url); }
}
