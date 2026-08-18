import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { JITSI_DOMAIN } from '@/lib/jitsiConfig';

export interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  email?: string;
  role: 'teacher' | 'student';
  sessionId: string;
  courseTitle?: string;
  onMeetingJoined?: (event: JitsiConferenceJoinedEvent) => void;
  onMeetingLeave?: () => void;
  onParticipantJoined?: (event: JitsiParticipantEvent) => void;
  onParticipantLeft?: (event: JitsiParticipantEvent) => void;
  onApiReady?: (api: JitsiMeetingApi | null) => void;
}

export type JitsiConferenceJoinedEvent = { id?: string };
export type JitsiParticipantEvent = { id?: string; displayName?: string };

// Jitsi External API types
interface JitsiExternalApiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width?: string | number;
  height?: string | number;
  userInfo?: {
    displayName?: string;
    email?: string;
  };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

export interface JitsiMeetingApi {
  addEventListeners: (listeners: Record<string, (event: unknown) => void>) => void;
  removeEventListener: (event: string) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
  getParticipantsInfo?: () => Promise<Array<{ participantId?: string; role?: string; displayName?: string }>>;
}
type JitsiExternalApiInstance = JitsiMeetingApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: JitsiExternalApiOptions
    ) => JitsiExternalApiInstance;
  }
}

export function JitsiMeeting({
  roomName,
  displayName,
  email,
  role,
  courseTitle,
  onMeetingJoined,
  onMeetingLeave,
  onParticipantJoined,
  onParticipantLeft,
  onApiReady,
}: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiExternalApiInstance | null>(null);
  const callbacksRef = useRef({ onMeetingJoined, onMeetingLeave, onParticipantJoined, onParticipantLeft, onApiReady });
  const joinedRef = useRef(false);
  const leftRecordedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbacksRef.current = { onMeetingJoined, onMeetingLeave, onParticipantJoined, onParticipantLeft, onApiReady };
  }, [onMeetingJoined, onMeetingLeave, onParticipantJoined, onParticipantLeft, onApiReady]);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    setError(null);
    setLoading(true);

    if (!roomName || !roomName.trim()) {
      setError('Invalid or missing Jitsi room name for this class session.');
      setLoading(false);
      return;
    }

    const scriptUrl = `https://${JITSI_DOMAIN}/external_api.js`;

    const initializeJitsi = () => {
      if (!isMounted || !container || !window.JitsiMeetExternalAPI) return;

      // Dispose existing instance if any
      if (apiRef.current) {
        try {
          apiRef.current.executeCommand('hangup');
          apiRef.current.dispose();
        } catch {
          // ignore cleanup errors
        }
        apiRef.current = null;
      }

      // Clear container DOM
      container.innerHTML = '';

      try {
        const isTeacher = role === 'teacher';
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: roomName.trim(),
          parentNode: container,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: displayName || (isTeacher ? 'Teacher' : 'Student'),
            email: email || undefined,
          },
          configOverwrite: {
            startWithAudioMuted: !isTeacher,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            hideConferenceSubject: false,
            subject: courseTitle || 'Skill Toss Live Class',
            toolbarButtons: isTeacher
              ? [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'raisehand',
                  'videoquality',
                  'filmstrip',
                  'participants-pane',
                  'tileview',
                  'select-background',
                  'mute-everyone',
                ]
              : [
                  'microphone',
                  'camera',
                  'closedcaptions',
                  'desktop',
                  'fullscreen',
                  'fodeviceselection',
                  'hangup',
                  'chat',
                  'raisehand',
                  'videoquality',
                  'filmstrip',
                  'tileview',
                  'select-background',
                ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
            TOOLBAR_ALWAYS_VISIBLE: false,
          },
        });

        const recordLeaveOnce = () => {
          if (!isMounted || !joinedRef.current || leftRecordedRef.current) return;
          leftRecordedRef.current = true;
          joinedRef.current = false;
          callbacksRef.current.onMeetingLeave?.();
        };

        api.addEventListeners({
          videoConferenceJoined: (event) => {
            if (!isMounted || joinedRef.current) return;
            joinedRef.current = true;
            leftRecordedRef.current = false;
            setLoading(false);
            callbacksRef.current.onMeetingJoined?.((event || {}) as JitsiConferenceJoinedEvent);
            void api.getParticipantsInfo?.().then((participants) => {
              const localParticipant = participants.find((participant) => participant.participantId === (event as JitsiConferenceJoinedEvent)?.id);
              if (import.meta.env.DEV) console.info('[Skill Toss Jitsi] participant role', {
                participantId: (event as JitsiConferenceJoinedEvent)?.id,
                role: localParticipant?.role || 'unknown',
                domain: JITSI_DOMAIN,
                room: roomName.trim(),
              });
            }).catch((error) => { if (import.meta.env.DEV) console.warn('[Skill Toss Jitsi] unable to inspect participant role', error); });
          },
          participantRoleChanged: (event) => {
            if (role === 'teacher' && import.meta.env.DEV) console.info('[Skill Toss Jitsi] participantRoleChanged', event);
          },
          videoConferenceLeft: recordLeaveOnce,
          readyToClose: recordLeaveOnce,
          participantJoined: (event) => callbacksRef.current.onParticipantJoined?.((event || {}) as JitsiParticipantEvent),
          participantLeft: (event) => callbacksRef.current.onParticipantLeft?.((event || {}) as JitsiParticipantEvent),
        });

        apiRef.current = api;
        callbacksRef.current.onApiReady?.(api);
        // If conference joined event takes a moment, stop loading after reasonable timeout
        window.setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 2500);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to launch Jitsi classroom.');
        setLoading(false);
      }
    };

    // Load External API script if not present
    if (!window.JitsiMeetExternalAPI) {
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', initializeJitsi);
        existingScript.addEventListener('error', () => {
          if (isMounted) {
            setError(`Could not connect to Jitsi server (${JITSI_DOMAIN}). Please check your connection.`);
            setLoading(false);
          }
        });
      } else {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => initializeJitsi();
        script.onerror = () => {
          if (isMounted) {
            setError(`Failed to load Jitsi API from ${JITSI_DOMAIN}. Please verify network access.`);
            setLoading(false);
          }
        };
        document.body.appendChild(script);
      }
    } else {
      initializeJitsi();
    }

    return () => {
      isMounted = false;
      joinedRef.current = false;
      leftRecordedRef.current = false;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // cleanup
        }
        apiRef.current = null;
      }
      callbacksRef.current.onApiReady?.(null);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [roomName, displayName, email, role, courseTitle]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-ink-950 rounded-t-xl overflow-hidden border border-ink-800">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-ink-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-primary-300">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold tracking-tight">{role === 'teacher' ? `Preparing ${courseTitle || 'your'} classroom…` : `Connecting to ${courseTitle || 'your class'}…`}</h3>
            <p className="text-xs text-ink-400">This may take a moment.</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 bg-ink-950 flex flex-col items-center justify-center text-white p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-error-500/20 border border-error-500/30 flex items-center justify-center text-error-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1.5 max-w-md">
            <h3 className="text-lg font-semibold text-white">Classroom Unavailable</h3>
            <p className="text-sm text-ink-300">Check your connection and try again.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
            </button>
            {callbacksRef.current.onMeetingLeave && (
              <button
                onClick={() => callbacksRef.current.onMeetingLeave?.()}
                className="btn-secondary text-xs px-4 py-2 text-white bg-ink-800 hover:bg-ink-700 border-ink-700"
              >
                Back to Classes
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jitsi Meeting Container */}
      <div ref={containerRef} className="w-full h-full min-h-[420px] bg-ink-950" />
    </div>
  );
}
