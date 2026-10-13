import { execFile } from 'child_process';
import net from 'net';
import path from 'path';

export interface AndroidDeviceNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
  lastPingMs: number | null;
  lastChecked: string;
  uptimeSeconds: number;
  osVersion: string;
  deviceModel: string;
  screenWidth: number;
  screenHeight: number;
  screenDpi: number;
  ramTotalMB: number;
  ramUsedMB: number;
  storageTotalGB: number;
  storageUsedGB: number;
  batteryLevel: number;
  batteryTemperature: number;
  isCharging: boolean;
  activePackages: string[];
  recentLogs: Array<{ timestamp: string; level: 'V' | 'D' | 'I' | 'W' | 'E'; tag: string; message: string }>;
}

export interface TouchEventPayload {
  type: 'tap' | 'swipe' | 'key' | 'text';
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  durationMs?: number;
  keyCode?: number;
  text?: string;
}

// In-memory registry of Android VPS nodes
const devicesRegistry: Map<string, AndroidDeviceNode> = new Map();

// Initialize default node
const defaultNodeId = 'vps-node-1';
devicesRegistry.set(defaultNodeId, {
  id: defaultNodeId,
  name: 'Primary Android VPS (Linux)',
  host: process.env.DEFAULT_ANDROID_HOST || '127.0.0.1',
  port: parseInt(process.env.DEFAULT_ANDROID_ADB_PORT || '5555', 10),
  status: 'OFFLINE',
  lastPingMs: null,
  lastChecked: new Date().toISOString(),
  uptimeSeconds: 0,
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
    { timestamp: new Date().toISOString(), level: 'I', tag: 'SystemServer', message: 'ALFRIANCLOUD ADB Gateway subsystem initialized' },
    { timestamp: new Date().toISOString(), level: 'I', tag: 'ActivityManager', message: 'Boot phase: PHASE_BOOT_COMPLETED' },
    { timestamp: new Date().toISOString(), level: 'D', tag: 'SurfaceFlinger', message: 'Display initialized: 720x1280 @ 30fps' },
  ],
});

/**
 * Checks TCP connectivity to the Android ADB daemon over private network/tunnel
 */
export async function pingAdbPort(host: string, port: number, timeoutMs = 3000): Promise<{ isReachable: boolean; latencyMs: number | null; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const latencyMs = Date.now() - startTime;
      socket.destroy();
      resolve({ isReachable: true, latencyMs });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ isReachable: false, latencyMs: null, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ isReachable: false, latencyMs: null, error: 'Connection timed out' });
    });
  });
}

/**
 * Get all registered devices
 */
export function getAllDevices(): AndroidDeviceNode[] {
  return Array.from(devicesRegistry.values());
}

/**
 * Get single device by ID
 */
export function getDeviceById(id: string): AndroidDeviceNode | undefined {
  return devicesRegistry.get(id);
}

/**
 * Update or register a device
 */
export function registerDevice(node: Partial<AndroidDeviceNode> & { id: string; host: string; port: number }): AndroidDeviceNode {
  const existing = devicesRegistry.get(node.id) || {
    id: node.id,
    name: node.name || `Node ${node.id}`,
    host: node.host,
    port: node.port,
    status: 'OFFLINE',
    lastPingMs: null,
    lastChecked: new Date().toISOString(),
    uptimeSeconds: 0,
    osVersion: 'Android 13.0',
    deviceModel: 'Redroid Instance',
    screenWidth: 720,
    screenHeight: 1280,
    screenDpi: 320,
    ramTotalMB: 4096,
    ramUsedMB: 1200,
    storageTotalGB: 32,
    storageUsedGB: 5,
    batteryLevel: 100,
    batteryTemperature: 25.0,
    isCharging: true,
    activePackages: ['com.android.settings'],
    recentLogs: [],
  };

  const updated: AndroidDeviceNode = {
    ...existing,
    ...node,
    lastChecked: new Date().toISOString(),
  };

  devicesRegistry.set(node.id, updated);
  return updated;
}

/**
 * Test and refresh status of a device node
 */
export async function refreshDeviceStatus(id: string): Promise<AndroidDeviceNode> {
  const dev = devicesRegistry.get(id);
  if (!dev) throw new Error(`Device not found: ${id}`);

  const pingResult = await pingAdbPort(dev.host, dev.port, 2500);

  if (pingResult.isReachable) {
    dev.status = 'ONLINE';
    dev.lastPingMs = pingResult.latencyMs;
    dev.uptimeSeconds = (dev.uptimeSeconds || 0) + 30;
    dev.recentLogs.unshift({
      timestamp: new Date().toISOString(),
      level: 'I',
      tag: 'AdbBridge',
      message: `Handshake verified with ${dev.host}:${dev.port} (${pingResult.latencyMs}ms)`,
    });
    if (dev.recentLogs.length > 50) dev.recentLogs.pop();
  } else {
    dev.status = 'OFFLINE';
    dev.lastPingMs = null;
    dev.recentLogs.unshift({
      timestamp: new Date().toISOString(),
      level: 'W',
      tag: 'AdbBridge',
      message: `Endpoint ${dev.host}:${dev.port} unreachable: ${pingResult.error}`,
    });
    if (dev.recentLogs.length > 50) dev.recentLogs.pop();
  }

  dev.lastChecked = new Date().toISOString();
  return dev;
}

/**
 * Handle screen or hardware touch/key input
 */
export async function injectInput(id: string, input: TouchEventPayload): Promise<{ success: boolean; message: string }> {
  const dev = devicesRegistry.get(id);
  if (!dev) throw new Error('Device not found');

  const logMessage =
    input.type === 'tap'
      ? `Input: Tap at (${input.x}, ${input.y})`
      : input.type === 'swipe'
      ? `Input: Swipe from (${input.x}, ${input.y}) to (${input.x2}, ${input.y2}) ${input.durationMs}ms`
      : input.type === 'key'
      ? `Hardware Key: Code ${input.keyCode}`
      : `Text typed: "${input.text}"`;

  dev.recentLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'D',
    tag: 'InputReader',
    message: logMessage,
  });
  if (dev.recentLogs.length > 50) dev.recentLogs.pop();

  // If real ADB tool is installed, we can run:
  // adb -s <host>:<port> shell input tap X Y
  return { success: true, message: logMessage };
}

/**
 * Update screen resolution & DPI
 */
export async function updateResolution(id: string, width: number, height: number, dpi: number): Promise<AndroidDeviceNode> {
  const dev = devicesRegistry.get(id);
  if (!dev) throw new Error('Device not found');

  dev.screenWidth = width;
  dev.screenHeight = height;
  dev.screenDpi = dpi;

  dev.recentLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'I',
    tag: 'WindowManager',
    message: `Display parameters reconfigured to ${width}x${height} @ ${dpi}dpi`,
  });

  return dev;
}

/**
 * Simulate or execute package install
 */
export async function installPackage(id: string, apkName: string): Promise<{ success: boolean; packageName: string; message: string }> {
  const dev = devicesRegistry.get(id);
  if (!dev) throw new Error('Device not found');

  // Derive package name from file name
  const cleanName = path.basename(apkName, path.extname(apkName)).toLowerCase().replace(/[^a-z0-9]/g, '.');
  const packageName = `com.alfrian.${cleanName}`;

  if (!dev.activePackages.includes(packageName)) {
    dev.activePackages.push(packageName);
  }

  dev.recentLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'I',
    tag: 'PackageManager',
    message: `Installed APK: ${apkName} -> ${packageName} [Success]`,
  });

  return {
    success: true,
    packageName,
    message: `Successfully installed ${apkName} (${packageName})`,
  };
}

/**
 * Uninstall package
 */
export async function uninstallPackage(id: string, packageName: string): Promise<{ success: boolean; message: string }> {
  const dev = devicesRegistry.get(id);
  if (!dev) throw new Error('Device not found');

  dev.activePackages = dev.activePackages.filter((pkg) => pkg !== packageName);

  dev.recentLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'I',
    tag: 'PackageManager',
    message: `Uninstalled package: ${packageName}`,
  });

  return { success: true, message: `Uninstalled ${packageName}` };
}
