import React, { useState, useRef } from 'react';
import {
  Upload,
  Package,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Download,
  Info,
  Layers,
} from 'lucide-react';
import { AndroidDeviceNode } from '../types';

interface ApkManagerProps {
  device: AndroidDeviceNode;
  onUploadApk: (file: File) => Promise<{ success: boolean; message: string; packageName?: string }>;
  onUninstallPackage: (pkg: string) => Promise<{ success: boolean; message: string }>;
  onLaunchPackage: (pkg: string) => void;
}

export const ApkManager: React.FC<ApkManagerProps> = ({
  device,
  onUploadApk,
  onUninstallPackage,
  onLaunchPackage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    state: 'idle' | 'uploading' | 'success' | 'error';
    message: string;
  }>({ state: 'idle', message: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.apk')) {
      setUploadStatus({
        state: 'error',
        message: 'Only .apk files (Android Package Archives) are accepted.',
      });
      return;
    }

    if (file.size > 150 * 1024 * 1024) {
      setUploadStatus({
        state: 'error',
        message: `File size exceeds 150MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus({ state: 'uploading', message: `Uploading & verifying ${file.name}...` });

    try {
      const res = await onUploadApk(file);
      if (res.success) {
        setUploadStatus({
          state: 'success',
          message: res.message || `Successfully installed ${file.name}!`,
        });
        setSelectedFile(null);
      } else {
        setUploadStatus({
          state: 'error',
          message: res.message || 'Installation failed.',
        });
      }
    } catch (err: any) {
      setUploadStatus({
        state: 'error',
        message: err.message || 'Network error during APK upload.',
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      {/* Compatibility Banner & Anti-Cheat / ARM Notice */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">
            APK Compatibility & Architecture Guidelines
          </div>
          <div className="text-amber-200/90 leading-relaxed">
            • <strong>Architecture:</strong> Redroid runs on the host kernel architecture (usually x86_64). APKs containing only ARM64/ARMv7 native libraries (<code className="px-1 py-0.5 bg-amber-900/40 rounded">lib/arm64-v8a</code>) require an ARM64 VPS (such as Oracle Ampere A1) or an active ARM translation layer (<code className="px-1 py-0.5 bg-amber-900/40 rounded">libndk_translation</code>).
            <br />
            • <strong>Google Play Services & Anti-Cheat:</strong> Pure Redroid containers do not include proprietary Google Play Services (GMS) by default. Use microG or F-Droid/Aurora Store. Games utilizing kernel-level anti-cheat (e.g., HoYoverse, Tencent ACE) will detect containerized environments and block execution.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload APK Zone (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-1">Install User APK</h3>
            <p className="text-xs text-slate-400 mb-4">
              Upload custom Android APK directly to the virtual container filesystem.
            </p>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-12 h-12 mx-auto rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <div className="text-xs font-semibold text-white mb-1">
                Drag & Drop .apk file or Browse
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Maximum size: 150 MB · Validated ZIP signature
              </div>
            </div>

            {/* Status message */}
            {uploadStatus.state !== 'idle' && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-mono flex items-start gap-2.5 ${
                  uploadStatus.state === 'uploading'
                    ? 'bg-blue-950/50 text-blue-300 border border-blue-800'
                    : uploadStatus.state === 'success'
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/50 text-rose-300 border border-rose-800'
                }`}
              >
                {uploadStatus.state === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                )}
                {uploadStatus.state === 'success' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                {uploadStatus.state === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="leading-snug break-all">{uploadStatus.message}</div>
              </div>
            )}
          </div>

          {/* Quick-Install Verified Packages */}
          <div className="p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-2">Verified Essential Presets</h3>
            <p className="text-xs text-slate-400 mb-3">
              One-click install pre-tested utility packages for virtual Android VPS.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">F-Droid App Store</div>
                    <div className="text-[10px] text-slate-500 font-mono">org.fdroid.fdroid</div>
                  </div>
                </div>
                <button
                  onClick={() => onLaunchPackage('org.fdroid.fdroid')}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  Launch
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Termux Terminal</div>
                    <div className="text-[10px] text-slate-500 font-mono">com.termux</div>
                  </div>
                </div>
                <button
                  onClick={() => onLaunchPackage('com.termux')}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                >
                  Launch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Installed Applications List (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Installed Packages</h3>
              <p className="text-xs text-slate-400">
                Queried via <code className="text-slate-300 font-mono">pm list packages -3</code>
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {device.activePackages.length} Packages Total
            </span>
          </div>

          <div className="space-y-2">
            {device.activePackages.map((pkg) => {
              const isSystemCore = ['com.android.settings', 'com.android.launcher3'].includes(pkg);

              return (
                <div
                  key={pkg}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-white truncate font-mono">
                        {pkg}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isSystemCore ? 'System Core Service' : 'User Installed Package'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => onLaunchPackage(pkg)}
                      title="Launch app on Android screen"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Launch</span>
                    </button>

                    {!isSystemCore && (
                      <button
                        onClick={() => onUninstallPackage(pkg)}
                        title="Uninstall package"
                        className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded border border-transparent hover:border-rose-900 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
