import crypto from 'crypto';

interface Session {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions: Map<string, Session> = new Map();
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

const MASTER_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function authenticateUser(password: string, clientIp: string): { success: boolean; token?: string; error?: string } {
  // Rate limit: max 5 attempts per 2 minutes per IP
  const now = Date.now();
  const attemptRecord = loginAttempts.get(clientIp) || { count: 0, lastAttempt: now };

  if (now - attemptRecord.lastAttempt > 120000) {
    attemptRecord.count = 0;
  }

  if (attemptRecord.count >= 5) {
    return {
      success: false,
      error: 'Too many failed login attempts. Please wait 2 minutes before retrying.',
    };
  }

  if (password !== MASTER_PASSWORD) {
    attemptRecord.count += 1;
    attemptRecord.lastAttempt = now;
    loginAttempts.set(clientIp, attemptRecord);
    return {
      success: false,
      error: 'Invalid password. Check your ADMIN_PASSWORD environment variable.',
    };
  }

  // Clear attempts
  loginAttempts.delete(clientIp);

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    token,
    username: 'admin',
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  return { success: true, token };
}

export function validateSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

export function logoutSession(token: string): void {
  activeSessions.delete(token);
}
