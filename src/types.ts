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
  recentLogs: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E';
  tag: string;
  message: string;
}

export interface SystemAuditResult {
  platform: string;
  isRailway: boolean;
  railwayEnvironment: string | null;
  kernelVersion: string;
  architecture: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpuCores: number;
  hasKvm: boolean;
  hasBinder: boolean;
  hasAshmem: boolean;
  hasDockerSocket: boolean;
  canRunRedroidLocally: boolean;
  compatibilityVerdict: {
    status: 'INCOMPATIBLE_LOCAL_RUNNER' | 'COMPATIBLE_VPS_RUNNER' | 'FULL_COMPLIANT';
    headline: string;
    reason: string;
    recommendedArchitecture: string;
    afk24hAssessment: string;
  };
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
