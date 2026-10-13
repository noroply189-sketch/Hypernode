import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Power,
  Volume2,
  Volume1,
  RotateCw,
  Home,
  ArrowLeft,
  Square,
  Maximize2,
  Camera,
  Keyboard,
  Settings as SettingsIcon,
  Wifi,
  Battery,
  Terminal,
  Globe,
  Folder,
  Send,
  Zap,
  Package,
} from 'lucide-react';
import { AndroidDeviceNode } from '../types';

interface ScreenViewerProps {
  device: AndroidDeviceNode;
  onSendInput: (input: {
    type: 'tap' | 'swipe' | 'key' | 'text';
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    durationMs?: number;
    keyCode?: number;
    text?: string;
  }) => Promise<any>;
  onChangeResolution: (width: number, height: number, dpi: number) => Promise<any>;
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({
  device,
  onSendInput,
  onChangeResolution,
}) => {
  const [isScreenOn, setIsScreenOn] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [activeApp, setActiveApp] = useState<'launcher' | 'settings' | 'terminal' | 'browser' | 'custom' | null>('launcher');
  const [activeCustomApp, setActiveCustomApp] = useState<string | null>(null);
  const [recentAppsOpen, setRecentAppsOpen] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number; id: number } | null>(null);
  const [lastInputDebug, setLastInputDebug] = useState<string>('adb shell input tap (ready)');
  const [textInputVal, setTextInputVal] = useState('');
  const [currentTime, setCurrentTime] = useState('12:00');

  const screenRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute normalized coordinates
  const getMappedCoordinates = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!screenRef.current) return { x: 0, y: 0, screenPixelX: 0, screenPixelY: 0 };
      const rect = screenRef.current.getBoundingClientRect();

      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const relativeX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const relativeY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      const actualWidth = orientation === 'portrait' ? device.screenWidth : device.screenHeight;
      const actualHeight = orientation === 'portrait' ? device.screenHeight : device.screenWidth;

      return {
        x: Math.round(relativeX * actualWidth),
        y: Math.round(relativeY * actualHeight),
        screenPixelX: clientX - rect.left,
        screenPixelY: clientY - rect.top,
      };
    },
    [device.screenWidth, device.screenHeight, orientation]
  );

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScreenOn) return;
    const coords = getMappedCoordinates(e);
    touchStartRef.current = { x: coords.x, y: coords.y, time: Date.now() };

    setTouchFeedback({ x: coords.screenPixelX, y: coords.screenPixelY, id: Date.now() });
    setTimeout(() => setTouchFeedback(null), 300);
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScreenOn || !touchStartRef.current) return;
    const coords = getMappedCoordinates(e);
    const start = touchStartRef.current;
    const duration = Date.now() - start.time;
    const deltaX = Math.abs(coords.x - start.x);
    const deltaY = Math.abs(coords.y - start.y);

    if (deltaX > 25 || deltaY > 25) {
      // Swipe gesture
      const cmd = `adb shell input swipe ${start.x} ${start.y} ${coords.x} ${coords.y} ${Math.max(100, duration)}`;
      setLastInputDebug(cmd);
      onSendInput({
        type: 'swipe',
        x: start.x,
        y: start.y,
        x2: coords.x,
        y2: coords.y,
        durationMs: duration,
      });
    } else {
      // Tap gesture
      const cmd = `adb shell input tap ${coords.x} ${coords.y}`;
      setLastInputDebug(cmd);
      onSendInput({ type: 'tap', x: coords.x, y: coords.y });
    }

    touchStartRef.current = null;
  };

  // Hardware key handlers
  const handleKey = (code: number, label: string) => {
    setLastInputDebug(`adb shell input keyevent ${code} (${label})`);
    onSendInput({ type: 'key', keyCode: code });

    if (code === 26) {
      setIsScreenOn((prev) => !prev);
    } else if (code === 3) {
      // Home
      setActiveApp('launcher');
      setRecentAppsOpen(false);
    } else if (code === 4) {
      // Back
      if (recentAppsOpen) setRecentAppsOpen(false);
      else if (activeApp !== 'launcher') setActiveApp('launcher');
    } else if (code === 187) {
      // App Switcher
      setRecentAppsOpen((prev) => !prev);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputVal.trim()) return;
    setLastInputDebug(`adb shell input text "${textInputVal}"`);
    onSendInput({ type: 'text', text: textInputVal });
    setTextInputVal('');
  };

  const openApp = (appId: 'settings' | 'terminal' | 'browser' | 'custom', customName?: string) => {
    setActiveApp(appId);
    if (customName) setActiveCustomApp(customName);
    setRecentAppsOpen(false);
    setLastInputDebug(`adb shell monkey -p ${customName || appId} 1`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Live Phone Stream Container (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950/60 p-4 sm:p-6 rounded-2xl border border-slate-800">
        {/* Stream Metrics Header */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono mb-4 px-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>30 FPS</span>
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>{orientation === 'portrait' ? `${device.screenWidth}x${device.screenHeight}` : `${device.screenHeight}x${device.screenWidth}`}</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>{device.screenDpi} DPI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Rotate</span>
            </button>
          </div>
        </div>

        {/* Realistic Android Hardware Frame */}
        <div className="relative flex items-center justify-center">
          {/* Hardware Side Buttons */}
          <div className="absolute -left-3 top-24 flex flex-col gap-3">
            <button
              onClick={() => handleKey(24, 'VOLUME_UP')}
              title="Volume Up (Key 24)"
              className="w-1.5 h-10 bg-slate-700 hover:bg-slate-600 rounded-l transition-colors"
            />
            <button
              onClick={() => handleKey(25, 'VOLUME_DOWN')}
              title="Volume Down (Key 25)"
              className="w-1.5 h-10 bg-slate-700 hover:bg-slate-600 rounded-l transition-colors"
            />
          </div>

          <div className="absolute -right-3 top-20">
            <button
              onClick={() => handleKey(26, 'POWER')}
              title="Power Button (Key 26)"
              className="w-1.5 h-12 bg-rose-600/80 hover:bg-rose-500 rounded-r transition-colors"
            />
          </div>

          {/* Phone Shell */}
          <div
            className={`transition-all duration-300 p-3 rounded-[38px] bg-[#121826] border-4 border-[#252f48] shadow-2xl shadow-blue-950/40 select-none ${
              orientation === 'portrait'
                ? 'w-[320px] sm:w-[350px] h-[640px] sm:h-[680px]'
                : 'w-[640px] sm:w-[680px] h-[340px] sm:h-[370px]'
            }`}
          >
            {/* Screen Inner Display Area */}
            <div
              ref={screenRef}
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              className="relative w-full h-full rounded-[26px] overflow-hidden bg-black flex flex-col justify-between cursor-crosshair shadow-inner"
              style={{
                backgroundImage: isScreenOn
                  ? 'radial-gradient(ellipse at bottom, #101c3d 0%, #050b18 100%)'
                  : 'none',
              }}
            >
              {/* Display Powered OFF state */}
              {!isScreenOn ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black text-slate-600 gap-2 font-mono text-xs">
                  <Power className="w-8 h-8 text-slate-700" />
                  <span>Display Suspended</span>
                  <span className="text-[10px]">Press Power key to wake</span>
                </div>
              ) : (
                <>
                  {/* Status Bar */}
                  <div className="w-full h-7 bg-black/40 backdrop-blur-sm flex items-center justify-between px-4 text-white text-[11px] font-mono z-10">
                    <span>{currentTime}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyan-400">5G</span>
                      <Wifi className="w-3 h-3 text-white" />
                      <div className="flex items-center gap-1">
                        <span>{device.batteryLevel}%</span>
                        <Battery className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Main Screen Content View */}
                  <div className="flex-1 w-full overflow-hidden p-3 relative">
                    {/* Visual Touch Ripple */}
                    {touchFeedback && (
                      <div
                        className="absolute w-8 h-8 rounded-full bg-cyan-400/40 border border-cyan-300 pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping"
                        style={{ left: touchFeedback.x, top: touchFeedback.y }}
                      />
                    )}

                    {/* App Switcher Overlay */}
                    {recentAppsOpen ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950/90 rounded-xl">
                        <span className="text-xs text-slate-400 font-mono mb-3">Recent Tasks</span>
                        <div className="flex gap-3 overflow-x-auto w-full py-2">
                          <button
                            onClick={() => openApp('settings')}
                            className="flex-shrink-0 w-32 h-44 bg-slate-900 border border-slate-700 rounded-lg p-2 text-left flex flex-col justify-between hover:border-blue-500 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-white">
                              <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
                              <span>Settings</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Android 13.0 System</span>
                          </button>

                          <button
                            onClick={() => openApp('terminal')}
                            className="flex-shrink-0 w-32 h-44 bg-slate-900 border border-slate-700 rounded-lg p-2 text-left flex flex-col justify-between hover:border-blue-500 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-white">
                              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Termux / Shell</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Active ADB Shell</span>
                          </button>
                        </div>
                      </div>
                    ) : activeApp === 'launcher' ? (
                      /* Home Screen Launcher */
                      <div className="w-full h-full flex flex-col justify-between">
                        {/* Clock & Widget */}
                        <div className="mt-4 flex flex-col items-center text-center">
                          <div className="text-4xl font-light text-white font-mono tracking-tight">
                            {currentTime}
                          </div>
                          <div className="text-xs text-cyan-300 font-medium mt-1">
                            Redroid Virtual VPS · AFK Ready
                          </div>
                          <div className="mt-3 w-11/12 py-1.5 px-3 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 text-xs flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] truncate">Search or enter URL...</span>
                          </div>
                        </div>

                        {/* App Icons Grid */}
                        <div className="grid grid-cols-4 gap-3 my-auto">
                          {/* Built-in Apps */}
                          <button
                            onClick={() => openApp('settings')}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                              <SettingsIcon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-slate-200 truncate w-full text-center">
                              Settings
                            </span>
                          </button>

                          <button
                            onClick={() => openApp('terminal')}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                              <Terminal className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-slate-200 truncate w-full text-center">
                              Terminal
                            </span>
                          </button>

                          <button
                            onClick={() => openApp('browser')}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                              <Globe className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-slate-200 truncate w-full text-center">
                              Chrome
                            </span>
                          </button>

                          <button
                            onClick={() => openApp('custom', 'org.fdroid.fdroid')}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-700 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                              <Folder className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-slate-200 truncate w-full text-center">
                              F-Droid
                            </span>
                          </button>

                          {/* User Installed Apps */}
                          {device.activePackages
                            .filter((pkg) => !['com.android.settings', 'com.android.launcher3', 'com.android.chrome', 'org.fdroid.fdroid'].includes(pkg))
                            .map((pkg) => (
                              <button
                                key={pkg}
                                onClick={() => openApp('custom', pkg)}
                                className="flex flex-col items-center gap-1 group"
                              >
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                  <span className="text-xs font-bold uppercase font-mono">
                                    {pkg.split('.').pop()?.substring(0, 3)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-200 truncate w-full text-center">
                                  {pkg.split('.').pop()}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : activeApp === 'settings' ? (
                      /* Settings App View */
                      <div className="w-full h-full bg-[#111827] rounded-xl p-3 text-slate-200 overflow-y-auto font-sans text-xs">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
                          <span className="font-semibold text-white">Android Settings</span>
                          <button
                            onClick={() => setActiveApp('launcher')}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Close
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                            <div className="font-medium text-white">About Emulated Phone</div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Model: {device.deviceModel}
                              <br />
                              OS: {device.osVersion}
                              <br />
                              Host Kernel: Linux 5.15+ (Binder enabled)
                            </div>
                          </div>
                          <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                            <div className="font-medium text-white">Display & Resolution</div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {device.screenWidth} x {device.screenHeight} ({device.screenDpi} DPI)
                            </div>
                          </div>
                          <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                            <div className="font-medium text-white">Memory & Storage</div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              RAM: {device.ramUsedMB}MB / {device.ramTotalMB}MB
                              <br />
                              Storage: {device.storageUsedGB}GB used of {device.storageTotalGB}GB
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : activeApp === 'terminal' ? (
                      /* Terminal App View */
                      <div className="w-full h-full bg-black rounded-xl p-2.5 text-emerald-400 font-mono text-[11px] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2 text-slate-400 text-[10px]">
                          <span>u0_a104@redroid:/ $</span>
                          <button
                            onClick={() => setActiveApp('launcher')}
                            className="text-slate-400 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                        <div>
                          [ALFRIANCLOUD Terminal Emulator]
                          <br />
                          $ uname -a
                          <br />
                          Linux redroid 5.15.0-x86_64 #1 SMP Android
                          <br />
                          $ getprop ro.build.version.release
                          <br />
                          13
                          <br />
                          $ dumpsys battery | grep level
                          <br />
                          &nbsp;&nbsp;level: {device.batteryLevel}
                        </div>
                      </div>
                    ) : (
                      /* Custom App / Browser View */
                      <div className="w-full h-full bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center text-slate-300">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-2">
                          <Package className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="font-semibold text-white text-xs">{activeCustomApp || 'Custom Application'}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Running actively in Redroid runtime.
                          <br />
                          Touch inputs are forwarded via ADB input subsystem.
                        </div>
                        <button
                          onClick={() => setActiveApp('launcher')}
                          className="mt-4 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded border border-slate-700"
                        >
                          Return to Home
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Android Bottom Navigation Bar */}
                  <div className="w-full h-10 bg-black/60 backdrop-blur-md flex items-center justify-around px-4 border-t border-slate-900 z-10">
                    {/* Back Button */}
                    <button
                      onClick={() => handleKey(4, 'BACK')}
                      title="Back (Key 4)"
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Home Button */}
                    <button
                      onClick={() => handleKey(3, 'HOME')}
                      title="Home (Key 3)"
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 hover:border-white transition-colors" />
                    </button>

                    {/* App Switcher Button */}
                    <button
                      onClick={() => handleKey(187, 'APP_SWITCH')}
                      title="Recents / App Switcher (Key 187)"
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Input HUD / Command Inspector */}
        <div className="w-full mt-4 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400 truncate">
            <span className="text-cyan-400 font-semibold">ADB:</span>
            <span className="text-slate-300 truncate">{lastInputDebug}</span>
          </div>
          <span className="text-[11px] text-slate-500 whitespace-nowrap ml-2">Latency: ~{device.lastPingMs || 15}ms</span>
        </div>
      </div>

      {/* RIGHT: Quick Controls, Text Typing & Resolution (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Hardware Keys Quick Bar */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Hardware Key Controls</h3>
            <span className="text-xs text-slate-500 font-mono">ADB Input Subsystem</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleKey(26, 'POWER')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Power</span>
            </button>

            <button
              onClick={() => handleKey(24, 'VOLUME_UP')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Vol +</span>
            </button>

            <button
              onClick={() => handleKey(25, 'VOLUME_DOWN')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Volume1 className="w-3.5 h-3.5" />
              <span>Vol -</span>
            </button>

            <button
              onClick={() => handleKey(4, 'BACK')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={() => handleKey(3, 'HOME')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleKey(187, 'APP_SWITCH')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Recents</span>
            </button>
          </div>
        </div>

        {/* Remote Keyboard Input Forwarder */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Send Keyboard Input</h3>
            <span className="text-xs text-slate-500 font-mono">adb shell input text</span>
          </div>

          <form onSubmit={handleSendText} className="flex gap-2">
            <input
              type="text"
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              placeholder="Type message or URL into Android..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Display Resolution & DPI Switcher */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Display Resolution & Density</h3>
            <span className="text-xs text-slate-500 font-mono">wm size / wm density</span>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeResolution(720, 1280, 320)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  device.screenWidth === 720 && device.screenHeight === 1280
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">HD 720p (Default)</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">720x1280 · 320 DPI</div>
                <div className="text-[10px] text-emerald-400 mt-1">Recommended for Low Latency</div>
              </button>

              <button
                onClick={() => onChangeResolution(1080, 1920, 480)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  device.screenWidth === 1080 && device.screenHeight === 1920
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">FHD 1080p</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">1080x1920 · 480 DPI</div>
                <div className="text-[10px] text-amber-400 mt-1">Higher Quality · More Bitrate</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
