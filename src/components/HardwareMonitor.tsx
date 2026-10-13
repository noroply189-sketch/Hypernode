import React from 'react';
import {
  Cpu,
  HardDrive,
  BatteryCharging,
  Clock,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import { AndroidDeviceNode } from '../types';

interface HardwareMonitorProps {
  device: AndroidDeviceNode;
}

export const HardwareMonitor: React.FC<HardwareMonitorProps> = ({ device }) => {
  const ramPercent = Math.round((device.ramUsedMB / device.ramTotalMB) * 100);
  const storagePercent = Math.round((device.storageUsedGB / device.storageTotalGB) * 100);

  const uptimeHours = Math.floor(device.uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((device.uptimeSeconds % 3600) / 60);

  return (
    <div className="space-y-6">
      {/* 24/7 AFK Suitability & Platform Limits Audit Card */}
      <div className="p-5 rounded-2xl bg-[#0d1322] border border-blue-900/60 shadow-lg shadow-blue-950/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                24/7 AFK Stability & Platform Constraint Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Evaluation of background botting, macro gaming, and platform uptime guarantees.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            SPLIT RUNNER: COMPATIBLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Dedicated VPS Persistence</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When Android runs on a dedicated Linux VPS (Ubuntu with Docker <code className="text-slate-300">--restart always</code>), processes continue running 24/7 without being terminated by browser tab closure.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Railway Dashboard Ephemeral Limits</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Railway Gateway serves your web UI and API. Railway containers may restart during deploys. Running Android on the VPS isolates your session from Gateway restarts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Doze Mode & Wake-Locks</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              To prevent Android from putting background tasks to sleep after 30 minutes, configure wake-lock:
              <br />
              <code className="text-[11px] font-mono text-cyan-300">dumpsys deviceidle whitelist +[pkg]</code>
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Hardware Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RAM Metric */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>RAM Allocation</span>
            </span>
            <span className="font-mono text-white">{ramPercent}%</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {device.ramUsedMB} <span className="text-xs text-slate-400 font-normal">/ {device.ramTotalMB} MB</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${ramPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Free: {device.ramTotalMB - device.ramUsedMB} MB
          </div>
        </div>

        {/* Storage Metric */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>Data Volume (/data)</span>
            </span>
            <span className="font-mono text-white">{storagePercent}%</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {device.storageUsedGB} <span className="text-xs text-slate-400 font-normal">/ {device.storageTotalGB} GB</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Free: {(device.storageTotalGB - device.storageUsedGB).toFixed(1)} GB
          </div>
        </div>

        {/* Battery Metric */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span>Virtual Power Supply</span>
            </span>
            <span className="font-mono text-emerald-400">CHARGING</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {device.batteryLevel}% <span className="text-xs text-slate-400 font-normal">({device.batteryTemperature}°C)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${device.batteryLevel}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            AC Plugged · 4.2V Constant
          </div>
        </div>

        {/* Uptime Metric */}
        <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Uptime Counter</span>
            </span>
            <span className="font-mono text-slate-400">SESSION</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {uptimeHours}h {uptimeMinutes}m
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-full" />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Total Seconds: {device.uptimeSeconds}s
          </div>
        </div>
      </div>

      {/* Android System Spec Details */}
      <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
        <h3 className="text-sm font-semibold text-white mb-4">Virtual Android Hardware Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">DEVICE MODEL (ro.product.model)</div>
            <div className="text-white font-medium mt-1">{device.deviceModel}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">ANDROID VERSION (ro.build.version.release)</div>
            <div className="text-white font-medium mt-1">{device.osVersion}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">NATIVE ABI (ro.product.cpu.abi)</div>
            <div className="text-white font-medium mt-1">x86_64 (Intel/AMD)</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">ACTIVE RESOLUTION (wm size)</div>
            <div className="text-white font-medium mt-1">
              {device.screenWidth} x {device.screenHeight} px
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">PIXEL DENSITY (wm density)</div>
            <div className="text-white font-medium mt-1">{device.screenDpi} DPI</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[11px]">KERNEL BINDER IPC</div>
            <div className="text-emerald-400 font-medium mt-1">/dev/binder (Loaded via Host)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
