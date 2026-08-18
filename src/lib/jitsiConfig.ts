/**
 * Jitsi Meet Centralized Configuration
 *
 * NOTE FOR DEVELOPMENT / DEMO:
 * - Default domain: 'meet.jit.si' (public development/demo server).
 * - Room names are generated deterministically per class session to guarantee Teacher & Student use the identical room.
 *
 * NOTE FOR PRODUCTION SECURITY ROADMAP:
 * - In production, replace meet.jit.si with a self-hosted Jitsi instance or 8x8 JaaS (Jitsi as a Service).
 * - Client components must NEVER sign JWT tokens or hold private keys in frontend Vite code.
 * - Server API will issue short-lived, signed JWT tokens for authenticated teachers (moderators) and students (participants).
 */

const RAW_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN as string | undefined;

export const JITSI_DOMAIN = (RAW_DOMAIN && RAW_DOMAIN.trim()) || 'meet.jit.si';

/**
 * Sanitize a string for safe usage in Jitsi room names (alphanumeric, dashes, underscores).
 */
export function sanitizeRoomIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Generate a single stable, authoritative deterministic Jitsi room name for a class session.
 * Format: skilltoss-{institutionId}-{sessionId}
 */
export function generateDeterministicRoomName(institutionId: string, sessionId: string): string {
  const cleanInst = sanitizeRoomIdentifier(institutionId || 'demo');
  const cleanSession = sanitizeRoomIdentifier(sessionId);
  return `skilltoss-${cleanInst}-${cleanSession}`;
}

/**
 * Returns the full web meeting URL for a given room name.
 */
export function getJitsiMeetingUrl(roomName: string, domain: string = JITSI_DOMAIN): string {
  return `https://${domain}/${roomName}`;
}
