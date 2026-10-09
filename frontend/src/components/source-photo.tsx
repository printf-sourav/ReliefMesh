import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { fixturesEnabled, imageUrl } from '../lib/api';
export function SourcePhoto({ id, location, className = '' }: { id: string; location: string; className?: string }) {
  const [failed,setFailed] = useState(false);
  const [src,setSrc] = useState(fixturesEnabled ? '' : imageUrl(id));
  useEffect(() => { setFailed(false); if (fixturesEnabled) void import('../mocks/transport').then(({ fixtureImage }) => setSrc(fixtureImage(id))); else setSrc(imageUrl(id)); }, [id]);
  return failed ? <div className={`photo-unavailable ${className}`}><ImageOff size={24}/><span>Photo unavailable</span></div> : src ? <img className={className} src={src} alt={`Incident source at ${location}`} onError={() => setFailed(true)}/> : <div className={`photo-unavailable ${className}`}>Loading photo…</div>;
}
