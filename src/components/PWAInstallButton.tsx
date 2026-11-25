import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 text-xs font-bold text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          Add to Home Screen
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/15 p-5 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-black">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                <br />
                2. Scroll down and select <strong>Add to Home Screen</strong> to launch Tamil Nadu Bus Simulator in full-screen app mode.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
