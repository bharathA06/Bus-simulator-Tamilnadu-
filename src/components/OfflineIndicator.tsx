import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 px-3 py-1.5 text-xs font-bold text-neutral-950 shadow-lg pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Local Routes &amp; Progress Active</span>
    </div>
  );
}
