import React from 'react';
import {
  Smartphone,
  Server,
  RefreshCw,
  Power,
  RotateCw,
  Settings,
  ShieldCheck,
  BookOpen,
  Activity,
  Package,
  Terminal,
  Cpu,
} from 'lucide-react';
import { AndroidDeviceNode } from '../types';

interface NavbarProps {
  device: AndroidDeviceNode | null;
  activeTab: 'screen' | 'apk' | 'hardware' | 'terminal' | 'guide';
  setActiveTab: (tab: 'screen' | 'apk' | 'hardware' | 'terminal' | 'guide') => void;
  onReconnect: () => void;
  onReboot: () => void;
  onOpenSettings: () => void;
  isConnecting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  device,
  activeTab,
  setActiveTab,
  onReconnect,
  onReboot,
  onOpenSettings,
  isConnecting,
}) => {
  const isOnline = device?.status === 'ONLINE';

  return (
    <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-mono">
                  ALFRIANCLOUD
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  ANDROID VPS
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>Railway Gateway</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Linux Runner</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('screen')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'screen'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Screen Stream</span>
            </button>

            <button
              onClick={() => setActiveTab('apk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'apk'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>APK Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'hardware'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware & AFK</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'terminal'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ADB Console</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>DevOps Architecture</span>
            </button>
          </nav>

          {/* Quick Node Controls & Status */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnecting
                    ? 'bg-amber-400 animate-ping'
                    : isOnline
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-rose-500'
                }`}
              />
              <span className={isOnline ? 'text-emerald-300' : 'text-slate-400'}>
                {isConnecting ? 'TESTING...' : isOnline ? 'ONLINE' : 'STANDBY'}
              </span>
              {device?.lastPingMs !== null && device?.lastPingMs !== undefined && isOnline && (
                <span className="text-slate-500 font-mono text-[11px]">
                  ({device.lastPingMs}ms)
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onReconnect}
                disabled={isConnecting}
                title="Test ADB connectivity"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin text-blue-400' : ''}`} />
              </button>

              <button
                onClick={onReboot}
                title="Reboot Android Container"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors border border-slate-700"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenSettings}
                title="Node Settings & Tunnel IP"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
