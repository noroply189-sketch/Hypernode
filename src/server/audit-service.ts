import fs from 'fs';
import os from 'os';

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

export function performSystemAudit(): SystemAuditResult {
  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );

  const railwayEnvironment = process.env.RAILWAY_ENVIRONMENT || null;

  // Check KVM hardware virtualization device
  let hasKvm = false;
  try {
    hasKvm = fs.existsSync('/dev/kvm');
  } catch {
    hasKvm = false;
  }

  // Check Android Binder kernel IPC device
  let hasBinder = false;
  try {
    hasBinder = fs.existsSync('/dev/binder') || fs.existsSync('/dev/binderfs/binder');
  } catch {
    hasBinder = false;
  }

  // Check ashmem memory driver
  let hasAshmem = false;
  try {
    hasAshmem = fs.existsSync('/dev/ashmem');
  } catch {
    hasAshmem = false;
  }

  // Check Docker socket availability
  let hasDockerSocket = false;
  try {
    hasDockerSocket = fs.existsSync('/var/run/docker.sock');
  } catch {
    hasDockerSocket = false;
  }

  let kernelVersion = os.release();
  try {
    if (fs.existsSync('/proc/version')) {
      kernelVersion = fs.readFileSync('/proc/version', 'utf8').trim().split('\n')[0];
    }
  } catch {
    // ignore
  }

  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const cpuCount = os.cpus().length;

  const canRunRedroidLocally = hasBinder && (hasKvm || true) && !isRailway;

  let verdictStatus: 'INCOMPATIBLE_LOCAL_RUNNER' | 'COMPATIBLE_VPS_RUNNER' | 'FULL_COMPLIANT' = 'INCOMPATIBLE_LOCAL_RUNNER';
  let headline = '';
  let reason = '';

  if (isRailway) {
    headline = 'Railway Hosting Environment (Gateway Architecture Required)';
    reason = 'Railway runs on shared microVM/rootless containers without privileged Docker execution (--privileged), lacks nested virtualization (/dev/kvm), and cannot load out-of-tree kernel modules (binder_linux). Redroid cannot boot directly inside Railway containers.';
  } else if (!hasBinder) {
    headline = 'Host Kernel Lacks Android Binder Modules';
    reason = 'The current OS kernel does not provide /dev/binder. Redroid requires IPC devices created via `modprobe binder_linux` or modern binderfs mounts.';
  } else {
    verdictStatus = 'FULL_COMPLIANT';
    headline = 'Direct Virtualization Supported';
    reason = 'The host has required kernel binder IPC devices and can run Redroid containers directly with --privileged.';
  }

  const recommendedArchitecture =
    'Split Architecture: Deploy the ALFRIANCLOUD Gateway on Railway for public web dashboard, user authentication, and API endpoints. Run Redroid on a Linux VPS (Ubuntu 22.04 with kernel 5.15+), connected via secure WireGuard, Tailscale, or SSH reverse tunnel.';

  const afk24hAssessment =
    'AFK 24-Hour Suitability: On Railway, background containers may sleep or be rebooted on redeploy/usage limits. Running Android on a dedicated Linux VPS with `restart: always` guarantees true 24/7 persistence for AFK gaming or automated tasks, while Railway acts as the persistent on-demand dashboard.';

  return {
    platform: isRailway ? 'Railway Container Infrastructure' : `${os.type()} ${os.arch()}`,
    isRailway,
    railwayEnvironment,
    kernelVersion,
    architecture: os.arch(),
    totalMemoryMB: totalMem,
    freeMemoryMB: freeMem,
    cpuCores: cpuCount,
    hasKvm,
    hasBinder,
    hasAshmem,
    hasDockerSocket,
    canRunRedroidLocally,
    compatibilityVerdict: {
      status: verdictStatus,
      headline,
      reason,
      recommendedArchitecture,
      afk24hAssessment,
    },
  };
}
