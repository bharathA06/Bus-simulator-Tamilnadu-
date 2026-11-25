import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bus,
  LogOut,
  MessageSquare,
  Play,
  Plus,
  Radio,
  Send,
  Users,
} from 'lucide-react';
import {
  BUS_LIVERIES,
  BUS_STOPS,
  ROUTES,
  RouteDefinition,
  TimeOfDayId,
  WeatherId,
} from '../game/constants';
import { PlayerProgress } from '../game/gameStore';
import { ConvoyChatMessage, ConvoyPeerTelemetry, convoySync } from '../game/convoySync';

interface MultiplayerScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
  onLaunchConvoy: (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId
  ) => void;
}

export function MultiplayerScreen({
  progress,
  onBack,
  onLaunchConvoy,
}: MultiplayerScreenProps) {
  const [roomCode, setRoomCode] = useState<string | null>(() => convoySync.getRoomCode());
  const [joinInput, setJoinInput] = useState('');
  const [peers, setPeers] = useState<ConvoyPeerTelemetry[]>(() => convoySync.getPeers());
  const [messages, setMessages] = useState<ConvoyChatMessage[]>(() => convoySync.getMessages());
  const [chatText, setChatText] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(ROUTES[0].id);

  const activeBus =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const selectedRoute = ROUTES.find((r) => r.id === selectedRouteId) || ROUTES[0];

  useEffect(() => {
    const unsub = convoySync.subscribe(() => {
      setRoomCode(convoySync.getRoomCode());
      setPeers(convoySync.getPeers());
      setMessages(convoySync.getMessages());
    });
    return unsub;
  }, []);

  const originStop =
    BUS_STOPS.find((s) => s.id === selectedRoute.stops[0]) || BUS_STOPS[0];

  // Heartbeat while sitting in lobby so peer browser tabs see us
  useEffect(() => {
    if (!roomCode) return;
    const publish = () => {
      convoySync.publishTelemetry({
        driverName: progress.driverName,
        liveryId: activeBus.id,
        routeId: selectedRoute.id,
        x: originStop.x,
        z: originStop.z,
        heading: originStop.idealHeading,
        speedKmh: 0,
        activeStopName: `Staging: ${originStop.nameEn}`,
      });
    };
    publish();
    const id = window.setInterval(publish, 1500);
    return () => window.clearInterval(id);
  }, [roomCode, progress.driverName, activeBus.id, selectedRoute.id, originStop.x, originStop.z, originStop.idealHeading, originStop.nameEn]);

  const handleHost = () => {
    const code = convoySync.hostRoom();
    setRoomCode(code);
  };

  const handleJoin = () => {
    const cleaned = joinInput.trim().toUpperCase();
    if (!cleaned) return;
    convoySync.joinRoom(cleaned);
    setJoinInput('');
  };

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    convoySync.sendChat(progress.driverName, chatText);
    setChatText('');
  };

  // Show latest 4 messages so the radio log never overflows or scrolls
  const visibleMessages = messages.slice(-4);
  const visiblePeers = peers.slice(0, 2);

  return (
    <div className="fixed inset-0 h-[100dvh] z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b border-white/10 bg-neutral-900 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black flex items-center gap-1.5 truncate">
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
              Convoy Multiplayer Lobby
            </h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 truncate">
              Live browser-tab convoy sync — share room code with another tab to drive side-by-side
            </p>
          </div>
        </div>

        {roomCode && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/40 font-mono text-xs font-black text-sky-300">
              ROOM: {roomCode}
            </div>
            <button
              onClick={() => convoySync.leaveRoom()}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-5 max-w-6xl w-full mx-auto grid grid-cols-12 gap-3 sm:gap-5 items-stretch">
        {/* Left: Room Connection & Active Drivers */}
        <div className="col-span-5 flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden">
          {!roomCode ? (
            <div className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2.5">
              <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                Create or Join Convoy
              </h2>
              <button
                onClick={handleHost}
                className="w-full min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Host Convoy Room
              </button>

              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-300">
                  Join Existing Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    placeholder="TN-4821"
                    className="flex-1 min-w-0 min-h-[38px] px-2.5 rounded-xl bg-neutral-950 border border-white/15 font-mono text-xs text-white uppercase focus:outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleJoin}
                    className="min-h-[38px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-black cursor-pointer shrink-0"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> Sync Active
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {peers.length + 1} Driver{peers.length > 0 ? 's' : ''}
                </span>
              </div>

              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full min-h-[38px] px-2.5 rounded-xl bg-neutral-950 border border-white/15 text-xs text-white"
              >
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.titleEn}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  onLaunchConvoy(
                    selectedRoute,
                    progress.settings.preferredTimeOfDay,
                    progress.settings.preferredWeather
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Convoy Drive
              </button>
            </div>
          )}

          {/* Active Drivers */}
          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Drivers in Convoy
            </h3>
            <div className="space-y-1.5 flex-1 min-h-0 overflow-hidden">
              <div className="p-2 rounded-xl bg-emerald-950/35 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bus className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">
                      {progress.driverName} (You)
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">{activeBus.name}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">READY</span>
              </div>

              {visiblePeers.map((p) => (
                <div
                  key={p.peerId}
                  className="p-2 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bus className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.driverName}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{p.activeStopName}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-sky-300 tabular-nums shrink-0">
                    {p.speedKmh} km/h
                  </span>
                </div>
              ))}

              {roomCode && peers.length === 0 && (
                <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                  Share <strong className="text-sky-300 font-mono">{roomCode}</strong> in another browser tab to sync 3D convoy buses.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Convoy Radio Dispatch Chat (Fixed Height, Zero Scroll) */}
        <div className="col-span-7 p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-neutral-300 shrink-0">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Convoy VHF Radio Chat
            </span>
            {messages.length > 4 && (
              <span className="text-[10px] font-mono text-neutral-400">
                Latest 4 of {messages.length}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden py-2 flex flex-col justify-end gap-1.5">
            {visibleMessages.length === 0 ? (
              <div className="text-xs text-neutral-500 text-center my-auto">
                {roomCode
                  ? 'No radio transmissions yet. Say Vanakkam to your convoy!'
                  : 'Host or join a room to open Convoy VHF Radio.'}
              </div>
            ) : (
              visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded-xl bg-neutral-950 border border-white/10 text-xs truncate"
                >
                  <span className="font-bold text-amber-400 mr-2">{m.sender}:</span>
                  <span className="text-neutral-200">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-white/10 flex gap-2 shrink-0">
            <input
              type="text"
              disabled={!roomCode}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder={roomCode ? 'Transmit message to convoy...' : 'Join a room first'}
              className="flex-1 min-h-[38px] px-3 rounded-xl bg-neutral-950 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400 disabled:opacity-40"
            />
            <button
              disabled={!roomCode || !chatText.trim()}
              onClick={handleSendChat}
              className="min-h-[38px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
