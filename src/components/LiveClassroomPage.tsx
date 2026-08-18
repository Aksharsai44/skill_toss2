import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, FileText, ShieldAlert, Users } from 'lucide-react';
import { JitsiMeeting, type JitsiConferenceJoinedEvent, type JitsiMeetingApi, type JitsiParticipantEvent } from '@/components/JitsiMeeting';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/authContext';
import { generateDeterministicRoomName } from '@/lib/jitsiConfig';
import { useLmsData } from '@/lib/lmsDataContext';
import { useStudentPortal } from '@/lib/studentPortalContext';

interface LiveClassroomPageProps {
  role: 'teacher' | 'student';
}

const formatSessionDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function LiveClassroomPage({ role }: LiveClassroomPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { state, updateClassSessionStatus, syncClassSession, recordOnlineJoin, recordOnlineLeave, getOnlineAttendanceForSession } = useLmsData();
  const { profile } = useAuth();
  const { viewerRole, selectedStudent, permissions } = useStudentPortal();
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [endClassOpen, setEndClassOpen] = useState(false);
  const [conferenceParticipants, setConferenceParticipants] = useState<Record<string, { id: string; displayName: string; joinedAt: string; leftAt?: string }>>({});
  const [ending, setEnding] = useState(false);
  const apiRef = useRef<JitsiMeetingApi | null>(null);

  const isTeacher = role === 'teacher';
  const isParent = viewerRole === 'parent';
  const session = state.classSessions.find((item) => item.id === sessionId);
  const course = state.courses.find((item) => item.id === session?.courseId);
  const batch = state.batches.find((item) => item.id === session?.batchId);
  const teacher = state.teachers.find((item) => item.id === session?.teacherId);
  const activeStudentId = selectedStudent?.id || 'student_001';
  const roomName = session?.jitsiRoomName || (session ? generateDeterministicRoomName(state.institution?.id || 'demo', session.id) : '');
  const attendanceSessions = session ? getOnlineAttendanceForSession(session.id) : [];
  const classResources = state.resources.filter((item) => item.courseId === session?.courseId && item.batchId === session?.batchId);
  const displayName = isTeacher ? (profile?.fullName || teacher?.name || 'Teacher') : (selectedStudent?.name || profile?.fullName || 'Student');
  const email = profile?.role ? `${profile.role}@skilltoss.demo` : undefined;

  const studentAttendance = attendanceSessions.filter((item) => item.studentId === activeStudentId);
  const studentJoinedAt = studentAttendance[0]?.joinedAt;
  const studentLeftAt = [...studentAttendance].reverse().find((item) => item.leftAt)?.leftAt;
  const participationMinutes = studentAttendance.reduce((total, item) => total + (item.durationMinutes || (item.leftAt ? 0 : Math.max(0, Math.floor((Date.now() - new Date(item.joinedAt).getTime()) / 60000)))), 0);

  useEffect(() => {
    if (!import.meta.env.DEV || !session) return;
    console.info('[Skill Toss Jitsi]', {
      sessionId: session.id,
      jitsiRoomName: roomName,
      jitsiDomain: import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si',
      viewerUserId: isTeacher ? session.teacherId : activeStudentId,
      viewerRole: isTeacher ? 'teacher' : viewerRole,
    });
  }, [activeStudentId, isTeacher, roomName, session, viewerRole]);

  useEffect(() => {
    if (isTeacher && session?.status === 'scheduled') updateClassSessionStatus(session.id, 'live');
  }, [isTeacher, session, updateClassSessionStatus]);
  useEffect(() => { if (session) void syncClassSession(session); }, [session, syncClassSession]);

  const classesPath = isTeacher ? '/teacher/classes' : '/student/classes';
  const leaveClassroom = useCallback(() => navigate(classesPath), [classesPath, navigate]);
  const handleJoined = useCallback((event: JitsiConferenceJoinedEvent) => {
    if (!isTeacher && session) recordOnlineJoin(session.id, activeStudentId, event.id);
  }, [activeStudentId, isTeacher, recordOnlineJoin, session]);
  const handleLeave = useCallback(() => {
    if (!isTeacher && session) recordOnlineLeave(session.id, activeStudentId);
    leaveClassroom();
  }, [activeStudentId, isTeacher, leaveClassroom, recordOnlineLeave, session]);
  const handleParticipantJoined = useCallback((event: JitsiParticipantEvent) => {
    if (!isTeacher || !event.id) return;
    setConferenceParticipants((current) => ({
      ...current,
      [event.id as string]: { id: event.id as string, displayName: event.displayName || 'Jitsi participant', joinedAt: new Date().toISOString() },
    }));
  }, [isTeacher]);
  const handleParticipantLeft = useCallback((event: JitsiParticipantEvent) => {
    if (!isTeacher || !event.id) return;
    setConferenceParticipants((current) => current[event.id as string] ? {
      ...current,
      [event.id as string]: { ...current[event.id as string], leftAt: new Date().toISOString() },
    } : current);
  }, [isTeacher]);
  const endClass = async () => {
    if (!session || ending || session.status === 'completed') return;
    setEnding(true);
    const endedAt = new Date().toISOString();
    if (import.meta.env.DEV) console.info('[Skill Toss Jitsi] executing endConference', { domain: import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si', room: roomName, sessionId: session.id });
    try { apiRef.current?.executeCommand('endConference'); } catch (error) { console.warn('[Skill Toss Jitsi] endConference failed; Skill Toss session will still be completed.', error); }
    updateClassSessionStatus(session.id, 'completed', { endedAt, endedBy: session.teacherId });
    const persisted = await syncClassSession({ ...session, status: 'completed', endedAt, endedBy: session.teacherId });
    if (import.meta.env.DEV) console.info('[Skill Toss session] completion result', { sessionId: session.id, persisted, endedAt });
    setEndClassOpen(false);
    navigate('/teacher/classes');
  };

  const stateScreen = (title: string, description: string, icon: typeof ShieldAlert, tone: string) => {
    const Icon = icon;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-6 h-6" /></div>
          <h1 className="mt-5 text-2xl font-bold font-display text-ink-950">{title}</h1>
          {course && <p className="mt-1 font-medium text-ink-700">{course.title}</p>}
          <p className="mt-2 text-sm leading-6 text-ink-500">{description}</p>
          {session && <p className="mt-3 text-xs text-ink-400">{formatSessionDate(session.date)} · {session.startTime}–{session.endTime}</p>}
          {session?.status === 'completed' && !isTeacher && (
            <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 p-4 text-left text-xs text-ink-600 space-y-1.5">
              <p className="font-semibold text-ink-800">Attendance</p>
              {studentJoinedAt && <p>Joined at {formatTime(studentJoinedAt)}</p>}
              {studentLeftAt && <p>Left at {formatTime(studentLeftAt)}</p>}
              {studentAttendance.length > 0 && <p>Participation: {participationMinutes} min</p>}
            </div>
          )}
          <button onClick={leaveClassroom} className="btn-primary mt-6"><ArrowLeft className="w-4 h-4" /> Back to Classes</button>
        </div>
      </div>
    );
  };

  if (!session) return stateScreen('Class not found', 'This class session is unavailable or has been removed from the schedule.', ShieldAlert, 'bg-ink-100 text-ink-500');
  if (isParent || (!isTeacher && !permissions.canJoinClass)) return stateScreen('Class details', 'Parents can view this scheduled class, but only enrolled students can enter the live classroom.', BookOpen, 'bg-primary-50 text-primary-600');
  if (session.status === 'cancelled') return stateScreen('Class cancelled', 'This session was cancelled by the instructor.', ShieldAlert, 'bg-error-50 text-error-600');
  if (session.status === 'completed') return stateScreen('Class ended', 'This session has finished. Any published class resources remain available from your portal.', CheckCircle, 'bg-success-50 text-success-600');

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <header className="flex flex-col gap-3 border-b border-ink-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={leaveClassroom} aria-label="Back to classes" className="mt-0.5 p-2 rounded-lg border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 active:scale-[0.97] transition-[background-color,transform] duration-150">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold font-display text-ink-950 sm:text-2xl">{course?.title || 'Live Classroom'}</h1>
              {session.status === 'live' && <Badge variant="error"><span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1" /> LIVE</Badge>}
            </div>
            <p className="mt-1 text-xs text-ink-500 sm:text-sm">
              {isTeacher ? batch?.name : teacher?.name} · {formatSessionDate(session.date)} · {session.startTime}–{session.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-11 sm:pl-0">
          {isTeacher && (
            <>
              <button onClick={() => setAttendanceOpen(true)} className="btn-secondary text-xs sm:text-sm"><Users className="w-4 h-4" /> Participants <span className="text-ink-400">{Object.values(conferenceParticipants).filter((item) => !item.leftAt).length}</span></button>
              <button onClick={() => setEndClassOpen(true)} className="btn-secondary text-xs sm:text-sm text-error-600 border-error-200 hover:bg-error-50">End Class</button>
            </>
          )}
          <button onClick={leaveClassroom} className="btn-secondary text-xs sm:text-sm">Exit</button>
        </div>
      </header>

      <main>
        <div className="h-[clamp(420px,calc(100dvh-250px),780px)] min-h-[420px] sm:min-h-[500px]">
          <JitsiMeeting
            roomName={roomName}
            displayName={displayName}
            email={email}
            role={isTeacher ? 'teacher' : 'student'}
            sessionId={session.id}
            courseTitle={course?.title}
            onMeetingJoined={handleJoined}
            onMeetingLeave={handleLeave}
            onParticipantJoined={handleParticipantJoined}
            onParticipantLeft={handleParticipantLeft}
            onApiReady={(api) => { apiRef.current = api; }}
          />
        </div>

        <div className="grid gap-4 border-b border-x border-ink-200 rounded-b-xl bg-white px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Class information</h2>
            <p className="mt-2 text-sm font-medium text-ink-800">{batch?.name} · {course?.code}</p>
            <p className="mt-1 text-xs text-ink-500">{teacher?.name} · Jitsi Meet</p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Class resources</h2>
            {classResources.length ? (
              <div className="mt-2 space-y-1.5">
                {classResources.slice(0, 3).map((resource) => <div key={resource.id} className="flex items-center gap-2 text-sm text-ink-700"><FileText className="w-3.5 h-3.5 text-primary-600" /><span className="truncate">{resource.title}</span><span className="text-[10px] text-ink-400">{resource.type}</span></div>)}
              </div>
            ) : <p className="mt-2 text-sm text-ink-400">No resources shared for this class.</p>}
          </section>

          <section className="sm:col-span-2 lg:col-span-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">{isTeacher ? 'Live attendance' : 'Your attendance'}</h2>
            {isTeacher ? (
              <button onClick={() => setAttendanceOpen(true)} className="mt-2 text-left text-sm font-medium text-primary-700 hover:text-primary-800">{Object.values(conferenceParticipants).filter((item) => !item.leftAt).length} connected · View Jitsi activity</button>
            ) : studentJoinedAt ? (
              <div className="mt-2 text-sm text-ink-700"><p>Joined at {formatTime(studentJoinedAt)} · {participationMinutes} min</p><p className="mt-1 text-xs text-ink-500">Attendance will be finalized when the session ends.</p></div>
            ) : <p className="mt-2 text-sm text-ink-400">Participation begins recording when you connect.</p>}
          </section>
        </div>
      </main>

      <Modal open={attendanceOpen} onClose={() => setAttendanceOpen(false)} title="Attendance and join activity" size="md">
        <div className="flex items-center gap-4 rounded-lg bg-ink-50 px-4 py-3 text-sm">
          <div><span className="block text-xl font-bold text-ink-900">{Object.keys(conferenceParticipants).length}</span><span className="text-xs text-ink-500">Participants seen</span></div>
          <div className="h-9 w-px bg-ink-200" />
          <div><span className="block text-xl font-bold text-ink-900">{Object.values(conferenceParticipants).filter((item) => !item.leftAt).length}</span><span className="text-xs text-ink-500">Currently connected</span></div>
        </div>
        {Object.keys(conferenceParticipants).length === 0 ? (
          <div className="py-12 text-center"><Users className="w-6 h-6 mx-auto text-ink-300" /><p className="mt-3 text-sm font-medium text-ink-700">No students have joined yet.</p><p className="mt-1 text-xs text-ink-500">Join activity will appear here once students enter the classroom.</p></div>
        ) : (
          <div className="mt-4 divide-y divide-ink-100">
            {Object.values(conferenceParticipants).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-ink-800">{item.displayName}</p><p className="mt-0.5 text-xs text-ink-500">Joined {formatTime(item.joinedAt)}{item.leftAt ? ` · Left ${formatTime(item.leftAt)}` : ''}</p></div><Badge variant={item.leftAt ? 'neutral' : 'success'}>{item.leftAt ? 'Left' : 'Connected'}</Badge></div>)}
          </div>
        )}
      </Modal>

      <Modal open={endClassOpen} onClose={() => setEndClassOpen(false)} title="End this class session?" size="sm">
        <p className="text-sm leading-6 text-ink-600">Students will no longer be able to join after the session is ended.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setEndClassOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={endClass} disabled={ending} className="btn-danger disabled:cursor-not-allowed disabled:opacity-60">{ending ? 'Ending…' : 'End Class'}</button>
        </div>
      </Modal>
    </div>
  );
}
