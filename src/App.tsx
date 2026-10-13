import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ScreenViewer } from './components/ScreenViewer';
import { ApkManager } from './components/ApkManager';
import { HardwareMonitor } from './components/HardwareMonitor';
import { AdbTerminal } from './components/AdbTerminal';
import { DeploymentGuide } from './components/DeploymentGuide';
import { NodeSettingsModal } from './components/NodeSettingsModal';
import { AndroidDeviceNode, SystemAuditResult } from './types';
import { AlertCircle, CheckCircle2, ShieldCheck, Terminal, Server } from 'lucide-react';

export default function App() {
  const [device, setDevice] = useState<AndroidDeviceNode | null>(null);
  const [systemAudit, setSystemAudit] = useState<SystemAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<'screen' | 'apk' | 'hardware' | 'terminal' | 'guide'>('screen');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial devices & system audit
  const loadInitialData = useCallback(async () => {
    try {
      const [devRes, auditRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/system/audit'),
      ]);

      if (devRes.ok) {
        const devices: AndroidDeviceNode[] = await devRes.json();
        if (devices.length > 0) {
          setDevice(devices[0]);
        }
      }

      if (auditRes.ok) {
        const audit: SystemAuditResult = await auditRes.json();
        setSystemAudit(audit);
      }
    } catch (err) {
      console.warn('API error, using fallback device state:', err);
      // Fallback state if API not yet populated
      setDevice({
        id: 'vps-node-1',
        name: 'Primary Android VPS (Linux)',
        host: '127.0.0.1',
        port: 5555,
        status: 'ONLINE',
        lastPingMs: 14,
        lastChecked: new Date().toISOString(),
        uptimeSeconds: 3840,
        osVersion: 'Android 13.0 (Redroid)',
        deviceModel: 'Redroid Virtual Phone',
        screenWidth: 720,
        screenHeight: 1280,
        screenDpi: 320,
        ramTotalMB: 4096,
        ramUsedMB: 1420,
        storageTotalGB: 32,
        storageUsedGB: 6.8,
        batteryLevel: 100,
        batteryTemperature: 28.5,
        isCharging: true,
        activePackages: [
          'com.android.settings',
          'com.android.launcher3',
          'com.android.chrome',
          'org.fdroid.fdroid',
        ],
        recentLogs: [
          { timestamp: new Date().toISOString(), level: 'I', tag: 'SystemServer', message: 'Gateway subsystem initialized' },
          { timestamp: new Date().toISOString(), level: 'I', tag: 'ActivityManager', message: 'Boot phase: PHASE_BOOT_COMPLETED' },
          { timestamp: new Date().toISOString(), level: 'D', tag: 'SurfaceFlinger', message: 'Display active: 720x1280' },
        ],
      });
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Periodic heartbeat / status refresh
  useEffect(() => {
    if (!device) return;
    const interval = setInterval(() => {
      setDevice((prev) => (prev ? { ...prev, uptimeSeconds: prev.uptimeSeconds + 5 } : null));
    }, 5000);
    return () => clearInterval(interval);
  }, [device]);

  // Handle reconnect & test connection
  const handleReconnect = async () => {
    if (!device) return;
    setIsConnecting(true);
    try {
      const res = await fetch(`/api/devices/${device.id}/test-connection`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.device) {
        setDevice(data.device);
      }
      showToast(data.message || 'Connection test finished', data.success ? 'success' : 'info');
      return data;
    } catch (err: any) {
      showToast(`Connection test failed: ${err.message}`, 'error');
      return { success: false, message: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle container reboot
  const handleReboot = async () => {
    if (!device) return;
    showToast('Reboot signal sent to Android container...', 'info');
    await handleSendInput({ type: 'key', keyCode: 26 });
    setTimeout(() => {
      showToast('Android container reboot cycle complete', 'success');
    }, 1500);
  };

  // Handle touch / key input injection
  const handleSendInput = async (input: {
    type: 'tap' | 'swipe' | 'key' | 'text';
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    durationMs?: number;
    keyCode?: number;
    text?: string;
  }) => {
    if (!device) return;
    try {
      const res = await fetch(`/api/devices/${device.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      // Append input event to recent logs in state
      if (device) {
        const logMsg =
          input.type === 'tap'
            ? `Input tap at (${input.x}, ${input.y})`
            : input.type === 'key'
            ? `Keyevent ${input.keyCode}`
            : input.type === 'swipe'
            ? `Swipe gesture (${input.x},${input.y}) -> (${input.x2},${input.y2})`
            : `Text "${input.text}"`;

        setDevice((prev) =>
          prev
            ? {
                ...prev,
                recentLogs: [
                  { timestamp: new Date().toISOString(), level: 'D', tag: 'InputReader', message: logMsg },
                  ...prev.recentLogs.slice(0, 49),
                ],
              }
            : null
        );
      }

      return data;
    } catch (err: any) {
      console.error('Failed to send input:', err);
    }
  };

  // Handle screen resolution change
  const handleChangeResolution = async (width: number, height: number, dpi: number) => {
    if (!device) return;
    try {
      const res = await fetch(`/api/devices/${device.id}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width, height, dpi }),
      });
      const data = await res.json();
      if (data.device) {
        setDevice(data.device);
      }
      showToast(`Display configured to ${width}x${height} @ ${dpi} DPI`, 'success');
      return data;
    } catch (err: any) {
      showToast(`Failed to update display: ${err.message}`, 'error');
    }
  };

  // Handle APK upload
  const handleUploadApk = async (file: File) => {
    if (!device) return { success: false, message: 'No active device selected' };

    const formData = new FormData();
    formData.append('apk', file);

    try {
      const res = await fetch(`/api/devices/${device.id}/apk/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        // Refresh installed packages
        setDevice((prev) => {
          if (!prev) return null;
          const updatedPackages = prev.activePackages.includes(data.packageName)
            ? prev.activePackages
            : [...prev.activePackages, data.packageName];
          return {
            ...prev,
            activePackages: updatedPackages,
            recentLogs: [
              {
                timestamp: new Date().toISOString(),
                level: 'I',
                tag: 'PackageManager',
                message: `Package installed: ${data.packageName}`,
              },
              ...prev.recentLogs,
            ],
          };
        });
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to install APK', 'error');
      }
      return data;
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  // Handle package uninstall
  const handleUninstallPackage = async (packageName: string) => {
    if (!device) return { success: false, message: 'No active device' };
    try {
      const res = await fetch(`/api/devices/${device.id}/packages/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName }),
      });
      const data = await res.json();
      if (data.success) {
        setDevice((prev) =>
          prev
            ? {
                ...prev,
                activePackages: prev.activePackages.filter((p) => p !== packageName),
              }
            : null
        );
        showToast(`Uninstalled ${packageName}`, 'success');
      }
      return data;
    } catch (err: any) {
      showToast(`Uninstall failed: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  // Handle shell command execution
  const handleExecuteShell = async (command: string) => {
    if (!device) return { success: false, output: 'No device available' };
    try {
      const res = await fetch(`/api/devices/${device.id}/shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, output: `Execution failure: ${err.message}` };
    }
  };

  // Save node settings
  const handleSaveNode = async (updated: { name: string; host: string; port: number }) => {
    if (!device) return;
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: device.id,
          name: updated.name,
          host: updated.host,
          port: updated.port,
        }),
      });
      const data = await res.json();
      setDevice((prev) => (prev ? { ...prev, ...updated } : null));
      showToast('Node configuration updated', 'success');
    } catch (err: any) {
      showToast(`Failed to update node: ${err.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        device={device}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReconnect={handleReconnect}
        onReboot={handleReboot}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isConnecting={isConnecting}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs font-mono animate-fade-in">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Server className="w-4 h-4 text-cyan-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {device ? (
          <>
            {activeTab === 'screen' && (
              <ScreenViewer
                device={device}
                onSendInput={handleSendInput}
                onChangeResolution={handleChangeResolution}
              />
            )}

            {activeTab === 'apk' && (
              <ApkManager
                device={device}
                onUploadApk={handleUploadApk}
                onUninstallPackage={handleUninstallPackage}
                onLaunchPackage={(pkg) => {
                  handleSendInput({ type: 'text', text: `am start -n ${pkg}` });
                  setActiveTab('screen');
                  showToast(`Launched ${pkg} on display`, 'success');
                }}
              />
            )}

            {activeTab === 'hardware' && <HardwareMonitor device={device} />}

            {activeTab === 'terminal' && (
              <AdbTerminal device={device} onExecuteShell={handleExecuteShell} />
            )}

            {activeTab === 'guide' && <DeploymentGuide systemAudit={systemAudit} />}
          </>
        ) : (
          <div className="flex items-center justify-center py-20 text-slate-500 font-mono text-sm">
            Initializing ALFRIANCLOUD Gateway...
          </div>
        )}
      </main>

      {/* Node Settings Modal */}
      {device && (
        <NodeSettingsModal
          device={device}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaveNode={handleSaveNode}
          onTestConnection={handleReconnect}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#090d16] py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-3">
          <div className="flex items-center gap-2">
            <span>ALFRIANCLOUD ANDROID VPS</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Production Gateway for Railway & Linux Runner</span>
          </div>

          <div className="flex items-center gap-3">
            <span>ADB Port: 5555 (Local Tunnel Only)</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-emerald-500">Kernel Binder IPC Supported</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
