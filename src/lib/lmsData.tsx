import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lmsDemoSeed, recordings as seedRecordings } from '@/lib/mockData';
import { LmsDataContext, type ActionResult, type Feedback, type LmsDataContextValue } from '@/lib/lmsDataContext';
import type { AttendanceStatus, LmsAssignment, LmsAttendanceRecord, LmsBatch, LmsClassSession, LmsCommunityMessage, LmsCourse, LmsDepartment, LmsExam, LmsExamResult, LmsFeeInvoice, LmsGoal, LmsLeaveRequest, LmsNotification, LmsPayment, LmsReceipt, LmsResource, LmsState, LmsStudent, LmsSubmission, LmsTeacher, OnlineAttendanceSession, SubmissionAttachment, CommunityPost, CommunityAnswer, CommunityUpvote, CommunityBookmark, CommunityFollow, CommunityReport, CourseModule, CourseLesson, CourseEnrollment, LessonProgress, CourseVersion, CourseReview, CourseStatus, LmsBetaProgram, LmsRoadmapFeature, LmsGlobalCampaign, LmsExecutiveDecision, LmsWorkflowRule, LmsIntegration, LmsBranchTheme, ClassRecording, RecordingView, AcademicEvent, AcademicEventType } from '@/lib/types';
import { generateDeterministicRoomName } from '@/lib/jitsiConfig';
import { supabase } from '@/lib/supabase';
import { getAttachment, putAttachment, removeAttachment } from '@/lib/attachmentStorage';

const STORAGE_KEY = 'skill-toss-lms-demo-v4';
const DEMO_NOW = '2026-08-12T12:00:00+05:30';


const cloneSeed = (): LmsState => JSON.parse(JSON.stringify(lmsDemoSeed)) as LmsState;
const loadState = (): LmsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...cloneSeed(), classRecordings: cloneSeed().classRecordings || seedRecordings, recordingViews: [] };
    const parsed = JSON.parse(raw) as LmsState;
    if (parsed.version !== lmsDemoSeed.version) return { ...cloneSeed(), classRecordings: cloneSeed().classRecordings || seedRecordings, recordingViews: [] };
    return {
      ...parsed,
      classRecordings: parsed.classRecordings && parsed.classRecordings.length > 0 ? parsed.classRecordings : seedRecordings,
      recordingViews: parsed.recordingViews || [],
      onlineAttendance: parsed.onlineAttendance || [],
      classSessions: (parsed.classSessions || []).map((session) => ({
        ...session,
        jitsiRoomName: session.jitsiRoomName || (session.mode === 'jitsi' || session.mode === 'online' ? generateDeterministicRoomName(parsed.institution?.id || 'demo', session.id) : undefined),
      })),
    };
  } catch {
    return { ...cloneSeed(), classRecordings: seedRecordings, recordingViews: [] };
  }
};

export function LmsDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LmsState>(loadState);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Sync state to local storage backup
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    const channel = supabase.channel('skill-toss-class-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, (payload) => {
        const row = payload.new as { id?: string; status?: LmsClassSession['status']; started_at?: string | null; ended_at?: string | null; ended_by?: string | null };
        if (!row.id || !row.status) return;
        if (import.meta.env.DEV) console.info('[Skill Toss session realtime] received', { channel: 'skill-toss-class-sessions', sessionId: row.id, status: row.status, endedAt: row.ended_at });
        setState((current) => ({
          ...current,
          classSessions: current.classSessions.map((session) => session.id === row.id ? {
            ...session, status: row.status as LmsClassSession['status'], startedAt: row.started_at ?? session.startedAt,
            endedAt: row.ended_at ?? session.endedAt, endedBy: row.ended_by ?? session.endedBy,
          } : session),
          onlineAttendance: row.status === 'completed' ? (current.onlineAttendance || []).map((record) => {
            if (record.classSessionId !== row.id || record.leftAt) return record;
            const leftAt = row.ended_at || new Date().toISOString();
            return { ...record, leftAt, durationMinutes: Math.max(1, Math.round((new Date(leftAt).getTime() - new Date(record.joinedAt).getTime()) / 60000)) };
          }) : current.onlineAttendance,
        }));
      }).subscribe((status) => {
        if (import.meta.env.DEV) console.info('[Skill Toss session realtime] subscription state', { channel: 'skill-toss-class-sessions', status });
      });
    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Class Recordings Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('skill-toss-class-recordings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_recordings' }, (payload) => {
        const row = payload.new as any;
        if (!row || !row.id) return;
        const formattedRec: ClassRecording = {
          id: row.id,
          title: row.title,
          courseId: row.course_id,
          courseTitle: row.course_title,
          subject: row.subject,
          batchId: row.batch_id,
          batchName: row.batch_name || row.batch_id,
          batch: row.batch_name || row.batch_id,
          teacherId: row.teacher_id,
          teacherName: row.teacher_name,
          classSessionId: row.class_session_id,
          date: row.date,
          duration: row.duration,
          attendees: row.views_count ? 30 : 28,
          videoUrl: row.video_url,
          thumbnail: row.thumbnail_url || 'https://images.pexels.com/photos/6147276/pexels-photo-6147276.jpeg?auto=compress&cs=tinysrgb&w=400',
          status: row.status || 'ready',
          viewsCount: row.views_count || 0,
          createdAt: row.created_at,
        };
        setState((current) => {
          const list = current.classRecordings || seedRecordings;
          const idx = list.findIndex((r) => r.id === row.id);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], ...formattedRec };
            return { ...current, classRecordings: updated };
          }
          return { ...current, classRecordings: [formattedRec, ...list] };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Academic Calendar Events Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('skill-toss-academic-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_events' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (!oldRow || !oldRow.id) return;
          setState((current) => ({
            ...current,
            academicEvents: (current.academicEvents || []).filter((e) => e.id !== oldRow.id),
          }));
          return;
        }
        const row = payload.new as any;
        if (!row || !row.id) return;
        const formattedEvent: AcademicEvent = {
          id: row.id,
          title: row.title,
          type: (row.event_type || 'other') as AcademicEventType,
          courseId: row.course_id,
          courseTitle: row.course_title,
          subject: row.subject,
          batchId: row.batch_id,
          batchName: row.batch_name,
          teacherId: row.teacher_id,
          teacherName: row.teacher_name,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          roomOrLink: row.room_or_link,
          description: row.description,
          reminderMinutes: row.reminder_minutes,
          createdBy: row.created_by,
          status: row.status || 'scheduled',
          createdAt: row.created_at,
        };
        setState((current) => {
          const list = current.academicEvents || [];
          const idx = list.findIndex((e) => e.id === row.id);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], ...formattedEvent };
            return { ...current, academicEvents: updated };
          }
          return { ...current, academicEvents: [formattedEvent, ...list] };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Exams & Submissions Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('skill-toss-exams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (!oldRow || !oldRow.id) return;
          setState((current) => ({ ...current, exams: current.exams.filter((e) => e.id !== oldRow.id) }));
          return;
        }
        const row = payload.new as any;
        if (!row || !row.id) return;
        const formattedExam: LmsExam = {
          id: row.id,
          title: row.title,
          examType: row.event_type || row.exam_type || 'internal',
          courseId: row.course_id,
          courseTitle: row.course_title,
          batchId: row.batch_id,
          batchName: row.batch_name,
          subject: row.subject,
          teacherId: row.teacher_id,
          teacherName: row.teacher_name,
          date: row.date,
          startTime: row.start_time,
          durationMinutes: row.duration_minutes,
          maxMarks: row.max_marks,
          passingMarks: row.passing_marks,
          syllabus: row.syllabus,
          instructions: row.instructions,
          questions: row.questions || [],
          attachmentName: row.attachment_name,
          status: row.status || 'scheduled',
          createdAt: row.created_at,
        };
        setState((current) => {
          const list = current.exams || [];
          const idx = list.findIndex((e) => e.id === row.id);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], ...formattedExam };
            return { ...current, exams: updated };
          }
          return { ...current, exams: [formattedExam, ...list] };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_submissions' }, (payload) => {
        const row = payload.new as any;
        if (!row || !row.id) return;
        const formattedRes: LmsExamResult = {
          id: row.id,
          examId: row.exam_id,
          studentId: row.student_id,
          studentName: row.student_name,
          rollNo: row.roll_no,
          batchId: row.batch_id,
          marks: row.marks || 0,
          maxMarks: row.max_marks || 50,
          percentage: row.percentage || 0,
          feedback: row.feedback,
          status: row.status || 'submitted',
          answers: row.answers || {},
          submittedAt: row.submitted_at,
          evaluatedAt: row.evaluated_at,
        };
        setState((current) => {
          const list = current.examResults || [];
          const idx = list.findIndex((r) => r.id === row.id);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], ...formattedRes };
            return { ...current, examResults: updated };
          }
          return { ...current, examResults: [formattedRes, ...list] };
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  // Initial Database Load & Realtime Sync from Supabase
  useEffect(() => {
    let active = true;

    // Multi-tab real-time communication channel
    let bc: BroadcastChannel | null = null;
    let bcRec: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('skilltoss_community_channel');
      bc.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        const { type, payload } = event.data;
        if (type === 'NEW_COMMUNITY_MESSAGE') {
          setState((current) => {
            const exists = (current.communityMessages || []).some((m) => m.id === payload.id);
            if (exists) return current;
            return { ...current, communityMessages: [...(current.communityMessages || []), payload] };
          });
        } else if (type === 'UPDATE_COMMUNITY_MESSAGE') {
          setState((current) => ({
            ...current,
            communityMessages: (current.communityMessages || []).map((m) => (m.id === payload.id ? payload : m)),
          }));
        } else if (type === 'DELETE_COMMUNITY_MESSAGE') {
          setState((current) => ({
            ...current,
            communityMessages: (current.communityMessages || []).filter((m) => m.id !== payload.id),
          }));
        }
      };

      bcRec = new BroadcastChannel('skilltoss_recordings_channel');
      bcRec.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        const { type, payload } = event.data;
        if (type === 'NEW_CLASS_RECORDING') {
          setState((current) => {
            const list = current.classRecordings || seedRecordings;
            const exists = list.some((r) => r.id === payload.id);
            if (exists) return current;
            return { ...current, classRecordings: [payload, ...list] };
          });
        } else if (type === 'UPDATE_RECORDING_VIEW') {
          setState((current) => {
            const list = current.classRecordings || seedRecordings;
            return {
              ...current,
              classRecordings: list.map((r) => r.id === payload.recordingId ? { ...r, viewsCount: payload.viewsCount } : r),
            };
          });
        } else if (type === 'DELETE_CLASS_RECORDING') {
          setState((current) => {
            const list = current.classRecordings || seedRecordings;
            return {
              ...current,
              classRecordings: list.filter((r) => r.id !== payload.id),
            };
          });
        }
      };

      const bcCal = new BroadcastChannel('skilltoss_calendar_channel');
      bcCal.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        const { type, payload } = event.data;
        if (type === 'NEW_ACADEMIC_EVENT') {
          setState((current) => {
            const exists = (current.academicEvents || []).some((e) => e.id === payload.id);
            if (exists) return current;
            return { ...current, academicEvents: [payload, ...(current.academicEvents || [])] };
          });
        } else if (type === 'UPDATE_ACADEMIC_EVENT') {
          setState((current) => ({
            ...current,
            academicEvents: (current.academicEvents || []).map((e) => (e.id === payload.id ? { ...e, ...payload } : e)),
          }));
        } else if (type === 'DELETE_ACADEMIC_EVENT') {
          setState((current) => ({
            ...current,
            academicEvents: (current.academicEvents || []).filter((e) => e.id !== payload.id),
          }));
        }
      };

      const bcEx = new BroadcastChannel('skilltoss_exams_channel');
      bcEx.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        const { type, payload } = event.data;
        if (type === 'NEW_EXAM' || type === 'UPDATE_EXAM') {
          setState((current) => {
            const idx = (current.exams || []).findIndex((e) => e.id === payload.id);
            if (idx >= 0) {
              const updated = [...current.exams];
              updated[idx] = { ...updated[idx], ...payload };
              return { ...current, exams: updated };
            }
            return { ...current, exams: [payload, ...current.exams] };
          });
        } else if (type === 'DELETE_EXAM') {
          setState((current) => ({ ...current, exams: current.exams.filter((e) => e.id !== payload.id) }));
        } else if (type === 'NEW_EXAM_SUBMISSION' || type === 'UPDATE_EXAM_SUBMISSION') {
          setState((current) => {
            const idx = (current.examResults || []).findIndex((r) => r.id === payload.id);
            if (idx >= 0) {
              const updated = [...current.examResults];
              updated[idx] = { ...updated[idx], ...payload };
              return { ...current, examResults: updated };
            }
            return { ...current, examResults: [payload, ...(current.examResults || [])] };
          });
        } else if (type === 'UPDATE_TEACHER_PROFILE') {
          setState((current) => {
            const updated = current.teachers.map((t) => (t.id === payload.id ? { ...t, ...payload } : t));
            return { ...current, teachers: updated };
          });
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    async function loadFromSupabase() {
      try {
        const [
          deptRes, batchRes, courseRes, teacherRes, studentRes,
          assignRes, subRes, attRes, examRes, examResRes,
          resRes, classRes, invRes, payRes, recRes, notifRes, eventRes, goalRes,
          leaveRes, forumRes, commRes,
          cpRes, caRes, cuRes, cbRes, cfRes, crRes,
          classRecRes, acadEventRes, examSubRes
        ] = await Promise.all([
          supabase.from('departments').select('*'),
          supabase.from('batches').select('*'),
          supabase.from('courses').select('*'),
          supabase.from('teachers').select('*'),
          supabase.from('students').select('*'),
          supabase.from('assignments').select('*'),
          supabase.from('submissions').select('*'),
          supabase.from('attendance_records').select('*'),
          supabase.from('exams').select('*'),
          supabase.from('exam_results').select('*'),
          supabase.from('resources').select('*'),
          supabase.from('class_sessions').select('*'),
          supabase.from('fee_invoices').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('receipts').select('*'),
          supabase.from('notifications').select('*'),
          supabase.from('events').select('*'),
          supabase.from('goals').select('*'),
          supabase.from('leave_requests').select('*'),
          supabase.from('forum_posts').select('*'),
          supabase.from('community_messages').select('*').order('created_at', { ascending: true }),
          supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
          supabase.from('community_answers').select('*').order('created_at', { ascending: true }),
          supabase.from('community_upvotes').select('*'),
          supabase.from('community_bookmarks').select('*'),
          supabase.from('community_follows').select('*'),
          supabase.from('community_reports').select('*'),
          supabase.from('class_recordings').select('*').order('created_at', { ascending: false }),
          supabase.from('academic_events').select('*').order('created_at', { ascending: false }),
          supabase.from('exam_submissions').select('*').order('submitted_at', { ascending: false }),
        ]);

        if (!active) return;


        setState((prev) => {
          const next = { ...prev };
          if (deptRes.data && deptRes.data.length > 0) {
            next.departments = deptRes.data as LmsDepartment[];
          }
          if (batchRes.data && batchRes.data.length > 0) {
            next.batches = batchRes.data.map((b: any) => ({
              id: b.id, name: b.name, departmentId: b.department_id || b.departmentId, teacherId: b.teacher_id || b.teacherId, schedule: b.schedule
            })) as LmsBatch[];
          }
          if (teacherRes.data && teacherRes.data.length > 0) {
            next.teachers = teacherRes.data.map((t: any) => ({
              id: t.id,
              name: t.name,
              email: t.email,
              phone: t.phone || '',
              courseIds: t.course_ids || t.courseIds || [],
              batchIds: t.batch_ids || t.batchIds || [],
              avatar: t.avatar || '',
              status: t.status || 'active',
              salary: t.salary,
              employeeId: t.employee_id || t.employeeId || 'EMP-CS-104',
              designation: t.designation || 'Assistant Professor',
              department: t.department || 'Computer Science',
              institution: t.institution || 'Bright Future College',
              dob: t.dob || '1990-03-15',
              gender: t.gender || 'Female',
              address: t.address || 'Sector 14, New Delhi',
              emergencyContact: t.emergency_contact || t.emergencyContact || '+91 90000 55555',
              joiningDate: t.joining_date || t.joiningDate || '2016-08-01',
              yearsOfExperience: t.years_of_experience || t.yearsOfExperience || '8+ Years',
              subjects: t.subjects?.length ? t.subjects : ['Data Structures', 'Python', 'Database Management Systems'],
              expertise: t.expertise?.length ? t.expertise : ['Data Science', 'Machine Learning', 'Artificial Intelligence'],
              education: t.education?.length ? t.education : [
                { id: 'edu_1', degree: 'M.Tech', specialization: 'Computer Science', institution: 'IIT Delhi', year: '2015', grade: 'CGPA: 9.2' },
                { id: 'edu_2', degree: 'B.Tech', specialization: 'Computer Science', institution: 'DTU', year: '2013', grade: 'CGPA: 8.8' }
              ],
              experience: t.experience?.length ? t.experience : [
                { id: 'exp_1', organization: 'Bright Future College', designation: 'Assistant Professor', startDate: '2016-08', endDate: 'Present', description: 'Teaching undergraduate CS courses and leading AI research lab.' }
              ],
              officialEmail: t.official_email || t.officialEmail || t.email || 'sneha@brightfuture.edu',
              officeLocation: t.office_location || t.officeLocation || 'Block B, Room 304, CS Dept',
              officeHours: t.office_hours || t.officeHours || 'Mon–Thu (2:00 PM – 4:00 PM)',
              availableDays: t.available_days || t.availableDays || ['Mon', 'Tue', 'Wed', 'Thu'],
              visibility: t.visibility || 'all',
              profileCompletion: t.profile_completion || 85,
            })) as LmsTeacher[];
          }
          if (studentRes.data && studentRes.data.length > 0) {
            next.students = studentRes.data.map((s: any) => ({
              id: s.id, name: s.name, rollNo: s.roll_no || s.rollNo, batchId: s.batch_id || s.batchId, departmentId: s.department_id || s.departmentId, email: s.email, phone: s.phone, parentPhone: s.parent_phone || s.parentPhone, address: s.address, emergencyContact: s.emergency_contact || s.emergencyContact, avatar: s.avatar, status: s.status
            })) as LmsStudent[];
          }
          if (assignRes.data && assignRes.data.length > 0) {
            next.assignments = assignRes.data.map((a: any) => ({
              id: a.id, title: a.title, courseId: a.course_id || a.courseId, batchId: a.batch_id || a.batchId, teacherId: a.teacher_id || a.teacherId, instructions: a.instructions, dueDate: a.due_date || a.dueDate, maxMarks: a.max_marks || a.maxMarks, attachmentName: a.attachment_name || a.attachmentName, status: a.status, createdAt: a.created_at || a.createdAt
            })) as LmsAssignment[];
          }
          if (subRes.data && subRes.data.length > 0) {
            next.submissions = subRes.data.map((s: any) => ({
              id: s.id, assignmentId: s.assignment_id || s.assignmentId, studentId: s.student_id || s.studentId, response: s.response, attachmentName: s.attachment_name || s.attachmentName, status: s.status, submittedAt: s.submitted_at || s.submittedAt, marks: s.marks, feedback: s.feedback, gradedAt: s.graded_at || s.gradedAt
            })) as LmsSubmission[];
          }
          if (attRes.data && attRes.data.length > 0) {
            next.attendance = attRes.data.map((a: any) => ({
              id: a.id, studentId: a.student_id || a.studentId, courseId: a.course_id || a.courseId, batchId: a.batch_id || a.batchId, date: a.date, status: a.status
            })) as LmsAttendanceRecord[];
          }
          if (examRes.data && examRes.data.length > 0) {
            next.exams = examRes.data.map((e: any) => ({
              id: e.id, courseId: e.course_id || e.courseId, batchId: e.batch_id || e.batchId, title: e.title, date: e.date, startTime: e.start_time || e.startTime, durationMinutes: e.duration_minutes || e.durationMinutes, maxMarks: e.max_marks || e.maxMarks, syllabus: e.syllabus, status: e.status
            })) as LmsExam[];
          }
          if (resRes.data && resRes.data.length > 0) {
            next.resources = resRes.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              description: r.description || '',
              courseId: r.course_id || r.courseId || 'course_dbms',
              batchId: r.batch_id || r.batchId || 'batch_001',
              type: r.type || 'PDF',
              uploadedBy: r.uploaded_by || r.uploadedBy || 'teacher_001',
              uploadedAt: r.uploaded_at || r.uploadedAt || new Date().toISOString(),
              downloadCount: Number(r.download_count ?? r.downloadCount ?? 0),
              url: r.url || r.resource_url || (r.id === 'resource_002' ? 'https://visualgo.net/en/graphds' : ''),
              subject: r.subject || (r.id === 'resource_001' ? 'DBMS' : r.id === 'resource_002' ? 'Algorithms' : ''),
              fileName: r.file_name || r.fileName || (r.id === 'resource_001' ? 'DBMS_Normalization_3NF.pdf' : ''),
              fileSize: Number(r.file_size || r.fileSize || (r.id === 'resource_001' ? 1572864 : 0)),
              visibility: r.visibility || 'batch',
              status: r.status || 'active',
              attachments: Array.isArray(r.attachments) ? r.attachments : [],
            })) as LmsResource[];
          }
          if (classRes.data && classRes.data.length > 0) {
            next.classSessions = classRes.data.map((c: any) => ({
              id: c.id, courseId: c.course_id || c.courseId, batchId: c.batch_id || c.batchId, teacherId: c.teacher_id || c.teacherId, date: c.date, startTime: c.start_time || c.startTime, endTime: c.end_time || c.endTime, mode: c.mode, location: c.location, status: c.status
            })) as LmsClassSession[];
          }
          if (invRes.data && invRes.data.length > 0) {
            next.feeInvoices = invRes.data.map((i: any) => ({
              id: i.id, studentId: i.student_id || i.studentId, title: i.title, total: Number(i.total), dueDate: i.due_date || i.dueDate, status: i.status
            })) as LmsFeeInvoice[];
          }
          if (goalRes.data && goalRes.data.length > 0) {
            next.goals = goalRes.data.map((g: any) => ({
              id: g.id, studentId: g.student_id || g.studentId, title: g.title, category: g.category, target: g.target, deadline: g.deadline, progress: g.progress, status: g.status
            })) as LmsGoal[];
          }
          if (leaveRes.data && leaveRes.data.length > 0) {
            next.leaveRequests = leaveRes.data.map((l: any) => ({
              id: l.id, studentName: l.student_name || l.studentName, batch: l.batch, leaveFrom: l.leave_from || l.leaveFrom, leaveTo: l.leave_to || l.leaveTo, reason: l.reason, status: l.status, requesterType: l.requester_type || l.requesterType || 'student', teacherName: l.teacher_name || l.teacherName, createdAt: l.created_at || l.createdAt
            }));
          }
          if (forumRes.data && forumRes.data.length > 0) {
            next.forumPosts = forumRes.data.map((f: any) => ({
              id: f.id, authorName: f.author_name || f.authorName, authorRole: f.author_role || f.authorRole, content: f.content, tags: f.tags || [], likes: f.likes || 0, comments: f.comments || 0, createdAt: f.created_at || f.createdAt
            }));
          }
          if (commRes.data && commRes.data.length > 0) {
            next.communityMessages = commRes.data.map((m: any) => ({
              id: m.id,
              batchId: m.batch_id || m.batchId,
              senderId: m.sender_id || m.senderId,
              senderName: m.sender_name || m.senderName,
              senderRole: m.sender_role || m.senderRole || 'student',
              senderAvatar: m.sender_avatar || m.senderAvatar || '',
              messageText: m.message_text || m.messageText || '',
              messageType: m.message_type || m.messageType || 'text',
              attachmentUrl: m.attachment_url || m.attachmentUrl,
              attachmentName: m.attachment_name || m.attachmentName,
              attachmentSize: m.attachment_size || m.attachmentSize || '',
              replyToId: m.reply_to_id || m.replyToId,
              replyToSenderName: m.reply_to_sender_name || m.replyToSenderName,
              replyToText: m.reply_to_text || m.replyToText,
              isPinned: m.is_pinned ?? m.isPinned ?? false,
              reactions: m.reactions || {},
              readBy: m.read_by || m.readBy || [],
              announcementTitle: m.announcement_title || m.announcementTitle,
              announcementTarget: m.announcement_target || m.announcementTarget,
              announcementDate: m.announcement_date || m.announcementDate,
              editedAt: m.edited_at || m.editedAt,
              status: m.status || 'sent',
              createdAt: m.created_at || m.createdAt || new Date().toISOString(),
            })) as LmsCommunityMessage[];
          }
          if (cpRes.data && cpRes.data.length > 0) {
            next.communityPosts = cpRes.data.map((p: any) => ({
              id: p.id,
              title: p.title,
              content: p.content,
              postType: p.post_type || p.postType || 'question',
              authorId: p.author_id || p.authorId,
              authorName: p.author_name || p.authorName,
              authorRole: p.author_role || p.authorRole || 'student',
              authorAvatar: p.author_avatar || p.authorAvatar,
              category: p.category || 'General',
              tags: p.tags || [],
              batchId: p.batch_id || p.batchId || '',
              departmentId: p.department_id || p.departmentId || '',
              attachmentUrl: p.attachment_url || p.attachmentUrl,
              attachmentName: p.attachment_name || p.attachmentName,
              isPinned: p.is_pinned ?? p.isPinned ?? false,
              isSolved: p.is_solved ?? p.isSolved ?? false,
              bestAnswerId: p.best_answer_id || p.bestAnswerId || '',
              viewsCount: p.views_count ?? p.viewsCount ?? 0,
              upvotesCount: p.upvotes_count ?? p.upvotesCount ?? 0,
              answersCount: p.answers_count ?? p.answersCount ?? 0,
              isHidden: p.is_hidden ?? p.isHidden ?? false,
              createdAt: p.created_at || p.createdAt,
              updatedAt: p.updated_at || p.updatedAt,
            })) as CommunityPost[];
          }
          if (caRes.data && caRes.data.length > 0) {
            next.communityAnswers = caRes.data.map((a: any) => ({
              id: a.id,
              postId: a.post_id || a.postId,
              authorId: a.author_id || a.authorId,
              authorName: a.author_name || a.authorName,
              authorRole: a.author_role || a.authorRole || 'student',
              authorAvatar: a.author_avatar || a.authorAvatar,
              content: a.content,
              upvotesCount: a.upvotes_count ?? a.upvotesCount ?? 0,
              isBestAnswer: a.is_best_answer ?? a.isBestAnswer ?? false,
              parentAnswerId: a.parent_answer_id || a.parentAnswerId || '',
              isHidden: a.is_hidden ?? a.isHidden ?? false,
              createdAt: a.created_at || a.createdAt,
              updatedAt: a.updated_at || a.updatedAt,
            })) as CommunityAnswer[];
          }
          if (cuRes.data && cuRes.data.length > 0) {
            next.communityUpvotes = cuRes.data.map((u: any) => ({
              id: u.id, userId: u.user_id || u.userId, targetType: u.target_type || u.targetType, targetId: u.target_id || u.targetId, createdAt: u.created_at || u.createdAt
            })) as CommunityUpvote[];
          }
          if (cbRes.data && cbRes.data.length > 0) {
            next.communityBookmarks = cbRes.data.map((b: any) => ({
              id: b.id, userId: b.user_id || b.userId, postId: b.post_id || b.postId, createdAt: b.created_at || b.createdAt
            })) as CommunityBookmark[];
          }
          if (cfRes.data && cfRes.data.length > 0) {
            next.communityFollows = cfRes.data.map((f: any) => ({
              id: f.id, userId: f.user_id || f.userId, postId: f.post_id || f.postId, createdAt: f.created_at || f.createdAt
            })) as CommunityFollow[];
          }
          if (crRes.data && crRes.data.length > 0) {
            next.communityReports = crRes.data.map((r: any) => ({
              id: r.id, reporterId: r.reporter_id || r.reporterId, reporterName: r.reporter_name || r.reporterName, targetType: r.target_type || r.targetType, targetId: r.target_id || r.targetId, postId: r.post_id || r.postId, reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at || r.createdAt
            })) as CommunityReport[];
          }
          if (classRecRes.data && classRecRes.data.length > 0) {
            next.classRecordings = classRecRes.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              courseId: r.course_id || r.courseId,
              courseTitle: r.course_title || r.courseTitle,
              subject: r.subject,
              batchId: r.batch_id || r.batchId,
              batchName: r.batch_name || r.batchName || r.batch,
              batch: r.batch_name || r.batchName || r.batch,
              teacherId: r.teacher_id || r.teacherId,
              teacherName: r.teacher_name || r.teacherName,
              classSessionId: r.class_session_id || r.classSessionId,
              date: r.date,
              duration: r.duration,
              attendees: r.attendees || 30,
              videoUrl: r.video_url || r.videoUrl,
              thumbnail: r.thumbnail_url || r.thumbnail || 'https://images.pexels.com/photos/6147276/pexels-photo-6147276.jpeg?auto=compress&cs=tinysrgb&w=400',
              status: r.status || 'ready',
              viewsCount: r.views_count ?? r.viewsCount ?? 0,
              createdAt: r.created_at || r.createdAt,
            })) as ClassRecording[];
          }
          if (acadEventRes.data && acadEventRes.data.length > 0) {
            next.academicEvents = acadEventRes.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              type: r.event_type || r.type || 'other',
              courseId: r.course_id || r.courseId,
              courseTitle: r.course_title || r.courseTitle,
              subject: r.subject,
              batchId: r.batch_id || r.batchId,
              batchName: r.batch_name || r.batchName,
              teacherId: r.teacher_id || r.teacherId,
              teacherName: r.teacher_name || r.teacherName,
              date: r.date,
              startTime: r.start_time || r.startTime,
              endTime: r.end_time || r.endTime,
              roomOrLink: r.room_or_link || r.roomOrLink,
              description: r.description,
              reminderMinutes: r.reminder_minutes ?? r.reminderMinutes ?? 15,
              createdBy: r.created_by || r.createdBy,
              status: r.status || 'scheduled',
              createdAt: r.created_at || r.createdAt,
            })) as AcademicEvent[];
          }
          if (examSubRes.data && examSubRes.data.length > 0) {
            next.examResults = examSubRes.data.map((r: any) => ({
              id: r.id,
              examId: r.exam_id || r.examId,
              studentId: r.student_id || r.studentId,
              studentName: r.student_name || r.studentName,
              rollNo: r.roll_no || r.rollNo,
              batchId: r.batch_id || r.batchId,
              marks: r.marks || 0,
              maxMarks: r.max_marks || r.maxMarks || 50,
              percentage: r.percentage || 0,
              feedback: r.feedback,
              status: r.status || 'submitted',
              answers: r.answers || {},
              submittedAt: r.submitted_at || r.submittedAt,
              evaluatedAt: r.evaluated_at || r.evaluatedAt,
            })) as LmsExamResult[];
          }
          return next;
        });
      } catch (err) {
        console.warn('Supabase DB fetch deferred to offline state:', err);
      }
    }

    loadFromSupabase();

    // Subscribe to realtime database notifications across LMS tables
    const channel = supabase
      .channel('lms_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadFromSupabase();
      })
      .subscribe();

    return () => {
      active = false;
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };

  }, []);

  const result = useCallback((ok: boolean, message: string): ActionResult => {
    setFeedback({ kind: ok ? 'success' : 'error', message });
    return ok ? { ok: true, message } : { ok: false, message };
  }, []);
  const nextId = useCallback((prefix: string) => `${prefix}_${String(state.nextId).padStart(4, '0')}`, [state.nextId]);
  const bump = useCallback((next: LmsState) => ({ ...next, nextId: next.nextId + 1 }), []);

  const getStudentAssignments = useCallback((studentId: string) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return [];
    return state.assignments.filter((item) => item.batchId === student.batchId).map((assignment) => ({
      ...assignment,
      courseTitle: state.courses.find((course) => course.id === assignment.courseId)?.title ?? 'Course',
      submission: state.submissions.find((submission) => submission.assignmentId === assignment.id && submission.studentId === studentId),
    })).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [state]);

  const getStudentFees = useCallback((studentId: string) => {
    const invoices = state.feeInvoices.filter((item) => item.studentId === studentId).map((invoice) => {
      const paid = state.payments.filter((payment) => payment.invoiceId === invoice.id && payment.status === 'completed').reduce((sum, payment) => sum + payment.amount, 0);
      return { ...invoice, paid, pending: Math.max(0, invoice.total - paid), status: paid >= invoice.total ? 'paid' : invoice.dueDate < DEMO_NOW.slice(0, 10) ? 'overdue' : 'pending' };
    });
    return { invoices, total: invoices.reduce((sum, item) => sum + item.total, 0), paid: invoices.reduce((sum, item) => sum + item.paid, 0), pending: invoices.reduce((sum, item) => sum + item.pending, 0) };
  }, [state.feeInvoices, state.payments]);

  const getStudentExams = useCallback((studentId: string) => {
    const batchId = state.students.find((item) => item.id === studentId)?.batchId;
    return state.exams.filter((exam) => exam.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date));
  }, [state.exams, state.students]);

  const getStudentResources = useCallback((studentId: string) => {
    const batchId = state.students.find((item) => item.id === studentId)?.batchId;
    return state.resources.filter((item) => item.batchId === batchId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [state.resources, state.students]);

  const getStudentSummary = useCallback((studentId: string) => {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return null;
    const records = state.attendance.filter((item) => item.studentId === studentId);
    const attended = records.filter((item) => item.status === 'present').length;
    const conducted = records.length;
    const attendance = conducted ? Math.round((attended / conducted) * 100) : 0;
    const recoveryClasses = attendance >= 75 ? 0 : Math.ceil((0.75 * conducted - attended) / 0.25);
    const fees = getStudentFees(studentId);
    const assignmentViews = getStudentAssignments(studentId);
    const pendingAssignments = assignmentViews.filter((item) => !item.submission || !['submitted', 'graded'].includes(item.submission.status)).length;
    const exams = getStudentExams(studentId);
    const upcomingExams = exams.filter((item) => item.status === 'scheduled' && new Date(item.date) >= new Date(DEMO_NOW.slice(0, 10))).length;
    const results = state.examResults.filter((item) => item.studentId === studentId).map((item) => {
      const exam = state.exams.find((entry) => entry.id === item.examId);
      const course = state.courses.find((entry) => entry.id === exam?.courseId);
      return { percentage: exam ? (item.marks / exam.maxMarks) * 100 : 0, subject: course?.title ?? 'Course' };
    });
    const graded = assignmentViews.filter((item) => item.submission?.status === 'graded' && item.submission.marks !== undefined).map((item) => ({ percentage: ((item.submission?.marks ?? 0) / item.maxMarks) * 100, subject: item.courseTitle }));
    const assessments = [...results, ...graded];
    const overallPerformance = assessments.length ? Math.round(assessments.reduce((sum, item) => sum + item.percentage, 0) / assessments.length) : 0;
    const bySubject = new Map<string, number[]>();
    assessments.forEach((item) => bySubject.set(item.subject, [...(bySubject.get(item.subject) ?? []), item.percentage]));
    const ranked = [...bySubject].map(([subject, values]) => ({ subject, average: values.reduce((sum, value) => sum + value, 0) / values.length })).sort((a, b) => b.average - a.average);
    return { student, attendance, attended, conducted, recoveryClasses, feeTotal: fees.total, feePaid: fees.paid, feePending: fees.pending, pendingAssignments, upcomingExams, overallPerformance, strongestSubject: ranked[0]?.subject ?? 'No results yet', needsAttention: ranked[ranked.length - 1]?.subject ?? 'No results yet' };
  }, [getStudentAssignments, getStudentExams, getStudentFees, state.attendance, state.courses, state.examResults, state.exams, state.students]);

  const addStudent = useCallback((input: Omit<LmsStudent, 'id' | 'avatar'> & { initialFeeTotal: number }) => {
    if (!input.name.trim() || !input.rollNo.trim() || !input.email.trim()) return result(false, 'Name, roll number, and email are required.');
    if (state.students.some((student) => student.rollNo.toLowerCase() === input.rollNo.toLowerCase() || student.email.toLowerCase() === input.email.toLowerCase())) return result(false, 'A student with this roll number or email already exists.');
    if (input.initialFeeTotal <= 0) return result(false, 'Initial fee total must be greater than zero.');
    const id = nextId('student');
    const { initialFeeTotal, ...studentInput } = input;
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name)}`;
    const invoiceId = `${id}_invoice_001`;

    // Write to Supabase DB
    supabase.from('students').insert({
      id, name: input.name, roll_no: input.rollNo, batch_id: input.batchId, department_id: input.departmentId, email: input.email, phone: input.phone, parent_phone: input.parentPhone, address: input.address || '', emergency_contact: input.emergencyContact || '', avatar, status: input.status || 'active'
    }).then();
    supabase.from('fee_invoices').insert({
      id: invoiceId, student_id: id, title: 'Semester Fee', total: initialFeeTotal, due_date: '2026-08-31', status: 'open'
    }).then();

    setState((current) => bump({ ...current, students: [...current.students, { ...studentInput, id, avatar }], feeInvoices: [...current.feeInvoices, { id: invoiceId, studentId: id, title: 'Semester Fee', total: initialFeeTotal, dueDate: '2026-08-31', status: 'open' }] }));
    return result(true, `${input.name} was added successfully.`);
  }, [bump, nextId, result, state.students]);

  const createAssignment = useCallback(async (input: Omit<LmsAssignment, 'id' | 'createdAt' | 'status'> & { attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => {
    if (!input.title.trim() || !input.instructions.trim() || !input.dueDate || input.maxMarks <= 0) return result(false, 'Title, instructions, due date, and valid marks are required.');
    const id = nextId('assignment');
    const attachments = (input.attachmentFiles || []).map((entry) => ({ ...entry, metadata: { ...entry.metadata, ownerType: 'assignment' as const, ownerId: id, uploadedBy: input.teacherId } }));
    try { await Promise.all(attachments.filter((entry) => Boolean(entry.file)).map((entry) => putAttachment(entry.metadata, entry.file as File))); } catch { return result(false, 'Assignment materials could not be saved locally.'); }
    const targets = state.students.filter((student) => student.batchId === input.batchId);
    // Write to Supabase DB
    supabase.from('assignments').insert({
      id, title: input.title, course_id: input.courseId, batch_id: input.batchId, teacher_id: input.teacherId, instructions: input.instructions, due_date: input.dueDate, max_marks: input.maxMarks, attachment_name: input.attachmentName, status: 'open', created_at: DEMO_NOW
    }).then();

    targets.forEach((student, index) => {
      supabase.from('notifications').insert({
        id: `${id}_notification_${index + 1}`, user_id: student.id, type: 'academic', title: 'New assignment', message: `${input.title} is now available.`, timestamp: DEMO_NOW, read: false, related_entity_id: id, path: '/student/assignments'
      }).then();
    });

    setState((current) => bump({ ...current, assignments: [...current.assignments, { ...input, attachments: attachments.map((entry) => entry.metadata), id, createdAt: DEMO_NOW, status: 'open' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index + 1}`, userId: student.id, type: 'academic' as const, title: 'New assignment', message: `${input.title} is now available.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/assignments' }))] }));
    return result(true, 'Assignment created and shared with the batch.');
  }, [bump, nextId, result, state.students]);

  const saveSubmission = useCallback(async (assignmentId: string, studentId: string, response: string, submit: boolean, attachments: Array<{ metadata: SubmissionAttachment; file?: File }> = []) => {
    if (!response.trim() && attachments.length === 0) return result(false, 'Add a response or attachment before saving.');
    const existing = state.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === studentId);
    if (existing?.status === 'graded') return result(false, 'A graded submission cannot be changed.');
    const submissionId = existing?.id || nextId('submission');
    const normalizedAttachments = attachments.map((item) => ({ ...item, metadata: { ...item.metadata, submissionId } }));
    try {
      await Promise.all(normalizedAttachments.filter((item): item is { metadata: SubmissionAttachment; file: File } => Boolean(item.file)).map((item) => putAttachment(item.metadata, item.file)));
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Skill Toss attachments] local save failed', error);
      return result(false, 'The attachment could not be saved locally. Please try again.');
    }
    const status = submit ? 'submitted' as const : 'in-progress' as const;
    const attachmentName = attachments[0]?.metadata?.fileName || null;
    // Write to Supabase DB
    supabase.from('submissions').upsert({
      id: submissionId, assignment_id: assignmentId, student_id: studentId, response, attachment_name: attachmentName, status, submitted_at: submit ? DEMO_NOW : null
    }).then();

    setState((current) => ({ ...current, submissions: existing ? current.submissions.map((item) => item.id === existing.id ? { ...item, response, attachments: normalizedAttachments.map((entry) => entry.metadata), status, updatedAt: new Date().toISOString(), submittedAt: submit ? DEMO_NOW : item.submittedAt } : item) : [...current.submissions, { id: submissionId, assignmentId, studentId, response, attachments: normalizedAttachments.map((entry) => entry.metadata), status, updatedAt: new Date().toISOString(), submittedAt: submit ? DEMO_NOW : undefined }], nextId: existing ? current.nextId : current.nextId + 1 }));
    return result(true, submit ? 'Assignment submitted successfully.' : 'Draft saved.');
  }, [nextId, result, state.submissions]);

  const gradeSubmission = useCallback((submissionId: string, marks: number, feedbackText: string) => {
    const submission = state.submissions.find((item) => item.id === submissionId);
    const assignment = state.assignments.find((item) => item.id === submission?.assignmentId);
    if (!submission || !assignment) return result(false, 'Submission not found.');
    if (marks < 0 || marks > assignment.maxMarks || !feedbackText.trim()) return result(false, `Enter marks between 0 and ${assignment.maxMarks} and include feedback.`);
    const notifId = nextId('notification');

    // Write to Supabase DB
    supabase.from('submissions').update({
      status: 'graded', marks, feedback: feedbackText, graded_at: DEMO_NOW
    }).eq('id', submissionId).then();

    supabase.from('notifications').insert({
      id: notifId, user_id: submission.studentId, type: 'academic', title: 'Assignment graded', message: `${assignment.title}: ${marks}/${assignment.maxMarks}`, timestamp: DEMO_NOW, read: false, related_entity_id: assignment.id, path: '/student/assignments'
    }).then();

    setState((current) => bump({ ...current, submissions: current.submissions.map((item) => item.id === submissionId ? { ...item, status: 'graded', marks, feedback: feedbackText, gradedAt: DEMO_NOW } : item), notifications: [...current.notifications, { id: notifId, userId: submission.studentId, type: 'academic', title: 'Assignment graded', message: `${assignment.title}: ${marks}/${assignment.maxMarks}`, timestamp: DEMO_NOW, read: false, relatedEntityId: assignment.id, path: '/student/assignments' }] }));
    return result(true, 'Grade published to the student and parent view.');
  }, [bump, nextId, result, state.assignments, state.submissions]);

  const markAttendance = useCallback((studentId: string, courseId: string, batchId: string, date: string, status: AttendanceStatus) => {
    if (!date) return result(false, 'Select an attendance date.');
    const existing = state.attendance.find((item) => item.studentId === studentId && item.courseId === courseId && item.date === date);
    const attId = existing ? existing.id : `${nextId('attendance')}_${studentId}_${date}`;

    // Write to Supabase DB
    supabase.from('attendance_records').upsert({
      id: attId, student_id: studentId, course_id: courseId, batch_id: batchId, date, status
    }).then();

    setState((current) => ({ ...current, attendance: existing ? current.attendance.map((item) => item.id === existing.id ? { ...item, status } : item) : [...current.attendance, { id: attId, studentId, courseId, batchId, date, status }], nextId: existing ? current.nextId : current.nextId + 1 }));
    return result(true, 'Attendance updated across student, parent, and reports.');
  }, [nextId, result, state.attendance]);

  const recordPayment = useCallback((invoiceId: string, studentId: string, amount: number, method: 'cash' | 'bank-transfer' | 'demo-card', reference: string, date: string) => {
    const invoice = state.feeInvoices.find((item) => item.id === invoiceId && item.studentId === studentId);
    const pending = getStudentFees(studentId).invoices.find((item) => item.id === invoiceId)?.pending ?? 0;
    if (!invoice) return result(false, 'Invoice not found.');
    if (amount <= 0 || amount > pending) return result(false, `Enter an amount between ₹1 and ₹${pending.toLocaleString('en-IN')}.`);
    if (!reference.trim() || !date) return result(false, 'Reference and payment date are required.');
    const paymentId = nextId('payment');
    const receiptId = `${paymentId}_receipt`;

    // Write to Supabase DB
    if (amount === pending) {
      supabase.from('fee_invoices').update({ status: 'paid' }).eq('id', invoiceId).then();
    }
    supabase.from('payments').insert({
      id: paymentId, invoice_id: invoiceId, student_id: studentId, amount, method, reference, date, status: 'completed', demo: true
    }).then();
    supabase.from('receipts').insert({
      id: receiptId, payment_id: paymentId, invoice_id: invoiceId, student_id: studentId, amount, date, method, reference, status: 'completed', demo: true
    }).then();

    setState((current) => bump({ ...current, feeInvoices: current.feeInvoices.map((item) => item.id === invoiceId && amount === pending ? { ...item, status: 'paid' } : item), payments: [...current.payments, { id: paymentId, invoiceId, studentId, amount, method, reference, date, status: 'completed', demo: true }], receipts: [...current.receipts, { id: receiptId, paymentId, invoiceId, studentId, amount, date, method, reference, status: 'completed', demo: true }], notifications: [...current.notifications, { id: `${paymentId}_notification`, userId: studentId, type: 'fees', title: 'Demo payment recorded', message: `₹${amount.toLocaleString('en-IN')} was recorded for ${invoice.title}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: receiptId, path: '/student/fees' }] }));
    return result(true, 'Demo payment recorded and receipt created.');
  }, [bump, getStudentFees, nextId, result, state.feeInvoices]);

  const addResource = useCallback(async (input: Omit<LmsResource, 'id' | 'uploadedAt' | 'downloadCount'> & { downloadCount?: number; attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }): Promise<ActionResult> => {
    if (!input.title.trim()) return result(false, 'Resource title is required.');
    if (input.type === 'LINK' && !input.url?.trim()) return result(false, 'A valid URL is required for LINK resource type.');

    const id = nextId('resource');
    const attachmentMetadataList: SubmissionAttachment[] = [];

    if (input.attachmentFiles && input.attachmentFiles.length > 0) {
      const attachments = input.attachmentFiles.map((entry) => ({
        ...entry,
        metadata: { ...entry.metadata, ownerType: 'resource' as const, ownerId: id, uploadedBy: input.uploadedBy }
      }));
      try {
        await Promise.all(attachments.filter((entry) => Boolean(entry.file)).map((entry) => putAttachment(entry.metadata, entry.file as File)));
        attachmentMetadataList.push(...attachments.map((entry) => entry.metadata));
      } catch {
        return result(false, 'Resource file upload failed. Could not store attachment locally.');
      }
    }

    const firstAttachment = attachmentMetadataList[0];
    const fileName = firstAttachment?.fileName ?? input.fileName ?? '';
    const fileSize = firstAttachment?.fileSize ?? input.fileSize ?? 0;
    const downloadCount = input.downloadCount ?? 0;
    const uploadedAt = new Date().toISOString();

    const newResourceRecord: LmsResource = {
      ...input,
      id,
      uploadedAt,
      downloadCount,
      fileName,
      fileSize,
      subject: input.subject || '',
      url: input.url || '',
      visibility: input.visibility || 'batch',
      status: 'active',
      attachments: attachmentMetadataList,
    };

    // Write to Supabase DB
    await supabase.from('resources').insert({
      id,
      title: input.title,
      description: input.description || '',
      course_id: input.courseId,
      batch_id: input.batchId,
      type: input.type,
      subject: input.subject || '',
      url: input.url || '',
      file_name: fileName,
      file_size: fileSize,
      download_count: downloadCount,
      visibility: input.visibility || 'batch',
      status: 'active',
      attachments: attachmentMetadataList,
      uploaded_by: input.uploadedBy,
      uploaded_at: uploadedAt,
    });

    const targets = state.students.filter((student) => student.batchId === input.batchId);

    setState((current) => bump({
      ...current,
      resources: [newResourceRecord, ...current.resources],
      notifications: [
        ...current.notifications,
        ...targets.map((student, index) => ({
          id: `${id}_notification_${index}`,
          userId: student.id,
          type: 'resource' as const,
          title: 'New study resource',
          message: `${input.title} (${input.type}) was added to your resources.`,
          timestamp: uploadedAt,
          read: false,
          relatedEntityId: id,
          path: '/student/resources',
        }))
      ]
    }));

    try {
      const bc = new BroadcastChannel('skilltoss_resources_channel');
      bc.postMessage({ type: 'RESOURCE_ADDED', resource: newResourceRecord });
      bc.close();
    } catch {}

    return result(true, 'Resource created and shared successfully.');
  }, [bump, nextId, result, state.students]);

  const incrementResourceDownload = useCallback(async (resourceId: string): Promise<ActionResult> => {
    let updatedCount = 0;
    try {
      const { data, error } = await supabase.rpc('increment_resource_download', { resource_id: resourceId });
      if (!error && typeof data === 'number' && data > 0) {
        updatedCount = data;
      } else {
        const { data: res } = await supabase.from('resources').select('download_count').eq('id', resourceId).single();
        const currentCount = res?.download_count ?? 0;
        updatedCount = currentCount + 1;
        await supabase.from('resources').update({ download_count: updatedCount }).eq('id', resourceId);
      }
    } catch {
      const match = state.resources.find((r) => r.id === resourceId);
      updatedCount = (match?.downloadCount ?? 0) + 1;
    }

    setState((current) => ({
      ...current,
      resources: current.resources.map((r) => r.id === resourceId ? { ...r, downloadCount: Math.max(r.downloadCount + 1, updatedCount) } : r),
    }));

    try {
      const bc = new BroadcastChannel('skilltoss_resources_channel');
      bc.postMessage({ type: 'RESOURCE_DOWNLOAD_INCREMENTED', resourceId, downloadCount: updatedCount });
      bc.close();
    } catch {}

    return result(true, 'Download count updated.');
  }, [result, state.resources]);

function createValidPdfBlob(title: string, description: string, subject: string, author: string): Blob {
  const contentText = `Skill Toss LMS - Study Material\n\nTitle: ${title}\nSubject: ${subject || 'General'}\nDescription: ${description || 'N/A'}\nAuthor: ${author || 'Faculty'}\nGenerated: ${new Date().toLocaleDateString('en-IN')}`;

  const pdfEscapedText = contentText
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n')
    .map((line, i) => `0 -${i === 0 ? 0 : 20} Td (${line}) Tj`)
    .join('\n');

  const streamData = `BT\n/F1 12 Tf\n50 750 Td\n${pdfEscapedText}\nET`;
  const streamLength = streamData.length;

  const pdfString = `%PDF-1.4
1 0 obj
<</Type /Catalog /Pages 2 0 R>>
endobj
2 0 obj
<</Type /Pages /Kids [3 0 R] /Count 1>>
endobj
3 0 obj
<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>
endobj
4 0 obj
<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>
endobj
5 0 obj
<</Length ${streamLength}>>
stream
${streamData}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000224 00000 n 
0000000297 00000 n 
trailer
<</Size 6 /Root 1 0 R>>
startxref
${370 + streamLength}
%%EOF`;

  return new Blob([pdfString], { type: 'application/pdf' });
}

  const downloadResourceFile = useCallback(async (resource: LmsResource): Promise<ActionResult> => {
    // 1. LINK RESOURCE HANDLING
    if (resource.type === 'LINK') {
      let rawUrl = (resource.url || (resource as any).resource_url || (resource as any).linkUrl || '').trim();
      if (!rawUrl && resource.id === 'resource_002') {
        rawUrl = 'https://visualgo.net/en/graphds';
      }
      if (rawUrl) {
        if (!/^https?:\/\//i.test(rawUrl)) {
          rawUrl = `https://${rawUrl}`;
        }
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
        return result(true, 'Resource link opened.');
      }
      return result(false, 'Resource URL is invalid.');
    }

    // 2. FILE RESOURCE HANDLING (PDF, PPT, DOC)
    const attachment = resource.attachments?.[0];
    let fileBlob: Blob | null = null;
    let fileName = resource.fileName || `${resource.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${resource.type.toLowerCase()}`;

    if (attachment) {
      fileName = attachment.fileName || fileName;
      const stored = await getAttachment(attachment.id);
      if (stored?.blob) {
        fileBlob = stored.blob;
      }
    }

    if (!fileBlob && resource.url && resource.url.startsWith('http')) {
      try {
        const response = await fetch(resource.url);
        if (response.ok) {
          fileBlob = await response.blob();
        }
      } catch {}
    }

    if (!fileBlob) {
      if (resource.type === 'PDF') {
        fileBlob = createValidPdfBlob(resource.title, resource.description || '', resource.subject || '', resource.uploadedBy || 'Faculty');
      } else {
        fileBlob = new Blob([
          `Skill Toss Study Material\n\nTitle: ${resource.title}\nDescription: ${resource.description}\nSubject: ${resource.subject || 'General'}\nType: ${resource.type}`
        ], { type: 'text/plain' });
      }
    }

    const blobUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    await incrementResourceDownload(resource.id);

    return result(true, `Downloading ${fileName}...`);
  }, [incrementResourceDownload, result]);

  const deleteResource = useCallback(async (resourceId: string): Promise<ActionResult> => {
    const resource = state.resources.find((r) => r.id === resourceId);
    if (!resource) return result(false, 'Resource not found.');

    if (resource.attachments && resource.attachments.length > 0) {
      await Promise.all(resource.attachments.map((att) => removeAttachment(att.id).catch(() => {})));
    }

    await supabase.from('resources').delete().eq('id', resourceId);

    setState((current) => ({
      ...current,
      resources: current.resources.filter((r) => r.id !== resourceId),
    }));

    try {
      const bc = new BroadcastChannel('skilltoss_resources_channel');
      bc.postMessage({ type: 'RESOURCE_DELETED', resourceId });
      bc.close();
    } catch {}

    return result(true, 'Resource deleted successfully.');
  }, [result, state.resources]);

  const scheduleExam = useCallback((input: Omit<LmsExam, 'id' | 'status'>) => {
    if (!input.title.trim() || !input.date || input.maxMarks <= 0 || input.durationMinutes <= 0) return result(false, 'Complete all exam fields with valid marks and duration.');
    const id = nextId('exam');
    const targets = state.students.filter((student) => student.batchId === input.batchId);

    // Write to Supabase DB
    supabase.from('exams').insert({
      id, course_id: input.courseId, batch_id: input.batchId, title: input.title, date: input.date, start_time: input.startTime, duration_minutes: input.durationMinutes, max_marks: input.maxMarks, syllabus: input.syllabus, status: 'scheduled'
    }).then();

    setState((current) => bump({ ...current, exams: [...current.exams, { ...input, id, status: 'scheduled' }], notifications: [...current.notifications, ...targets.map((student, index) => ({ id: `${id}_notification_${index}`, userId: student.id, type: 'academic' as const, title: 'Exam scheduled', message: `${input.title} is scheduled for ${input.date}.`, timestamp: DEMO_NOW, read: false, relatedEntityId: id, path: '/student/exams' }))] }));
    return result(true, 'Exam scheduled and students notified.');
  }, [bump, nextId, result, state.students]);


  const scheduleClass = useCallback((input: Omit<LmsClassSession, 'id' | 'status'> & { id?: string; status?: LmsClassSession['status'] }) => {
    if (!input.courseId || !input.batchId || !input.date || !input.startTime || !input.endTime) return result(false, 'Complete all class schedule fields.');
    const id = input.id || nextId('class');
    const isJitsi = input.mode === 'jitsi' || input.mode === 'online';
    const roomName = input.jitsiRoomName || (isJitsi ? generateDeterministicRoomName(state.institution?.id || 'institution_001', id) : undefined);
    const location = input.location?.trim() || (isJitsi ? 'Jitsi Live Meeting' : 'Classroom');
    const sessionRecord: LmsClassSession = {
      ...input,
      id,
      mode: isJitsi ? 'jitsi' : 'classroom',
      location,
      meetingProvider: isJitsi ? 'jitsi' : undefined,
      jitsiRoomName: roomName,
      status: input.status || 'scheduled',
    };

    const course = state.courses.find((c) => c.id === input.courseId);
    const courseTitle = course?.title || 'Class';

    setState((current) => bump({
      ...current,
      classSessions: [...current.classSessions, sessionRecord],
      notifications: [
        ...current.notifications,
        ...current.students.filter((student) => student.batchId === input.batchId).map((student, index) => ({
          id: `${id}_notification_${index}`,
          userId: student.id,
          type: 'academic' as const,
          title: isJitsi ? 'New live class scheduled' : 'Class scheduled',
          message: `${courseTitle} is scheduled on ${input.date} at ${input.startTime}${isJitsi ? ' via Jitsi Meet.' : '.'}`,
          timestamp: DEMO_NOW,
          read: false,
          relatedEntityId: id,
          path: '/student/classes',
        })),
      ],
    }));
    return result(true, isJitsi ? 'Live class scheduled with Jitsi Meet.' : 'Class scheduled.');
  }, [bump, nextId, result, state.courses, state.institution?.id]);

  const updateClassSessionStatus = useCallback((sessionId: string, status: LmsClassSession['status'], metadata?: Pick<LmsClassSession, 'startedAt' | 'endedAt' | 'endedBy'>) => {
    const session = state.classSessions.find((s) => s.id === sessionId);
    if (!session) return result(false, 'Class session not found.');

    const course = state.courses.find((c) => c.id === session.courseId);
    const courseTitle = course?.title || 'Class';

    setState((current) => {
      let notifications = current.notifications;
      if (status === 'cancelled') {
        const batchStudents = current.students.filter((s) => s.batchId === session.batchId);
        notifications = [
          ...notifications,
          ...batchStudents.map((s, idx) => ({
            id: `cancel_${sessionId}_${idx}`,
            userId: s.id,
            type: 'academic' as const,
            title: 'Class cancelled',
            message: `${courseTitle} scheduled for ${session.date} at ${session.startTime} has been cancelled.`,
            timestamp: new Date().toISOString(),
            read: false,
            relatedEntityId: sessionId,
            path: '/student/classes',
          })),
        ];
      }
      return {
        ...current,
        classSessions: current.classSessions.map((s) => (s.id === sessionId ? { ...s, status, ...metadata } : s)),
        notifications,
      };
    });
    return result(true, `Class status updated to ${status}.`);
  }, [result, state.classSessions, state.courses]);

  const syncClassSession = useCallback(async (session: LmsClassSession) => {
    const { data: existing, error: readError } = await supabase.from('class_sessions').select('status, started_at, ended_at, ended_by').eq('id', session.id).maybeSingle();
    if (readError && import.meta.env.DEV) console.warn('[Skill Toss session realtime]', readError.message);
    if (existing?.status === 'completed' && session.status !== 'completed') {
      setState((current) => ({ ...current, classSessions: current.classSessions.map((item) => item.id === session.id ? {
        ...item, status: 'completed', endedAt: existing.ended_at, endedBy: existing.ended_by,
      } : item) }));
      return true;
    }
    const { error } = await supabase.from('class_sessions').upsert({
      id: session.id, course_id: session.courseId, teacher_id: session.teacherId, batch_id: session.batchId,
      status: session.status, jitsi_room_name: session.jitsiRoomName, scheduled_start: `${session.date}T${session.startTime}`,
      scheduled_end: `${session.date}T${session.endTime}`, started_at: session.startedAt ?? null, ended_at: session.endedAt ?? null,
      ended_by: session.endedBy ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) {
      if (import.meta.env.DEV) console.error('[Skill Toss session realtime] session write failed', { sessionId: session.id, status: session.status, message: error.message });
      return false;
    }
    return true;
  }, []);

  const recordOnlineJoin = useCallback((sessionId: string, studentId: string, jitsiParticipantId?: string) => {
    if (!sessionId || !studentId) return;
    const nowIso = new Date().toISOString();
    setState((current) => {
      // Create new join entry (supports multiple joins if reconnected)
      const newAttendanceRecord: OnlineAttendanceSession = {
        id: `att_${sessionId}_${studentId}_${Date.now()}`,
        classSessionId: sessionId,
        studentId,
        jitsiParticipantId,
        joinedAt: nowIso,
      };
      return {
        ...current,
        onlineAttendance: [...(current.onlineAttendance || []), newAttendanceRecord],
      };
    });
  }, []);

  const recordOnlineLeave = useCallback((sessionId: string, studentId: string) => {
    if (!sessionId || !studentId) return;
    const nowIso = new Date().toISOString();
    setState((current) => {
      const records = current.onlineAttendance || [];
      // Find latest unclosed session for this student and class session
      const matchingIdx = [...records].reverse().findIndex((r) => r.classSessionId === sessionId && r.studentId === studentId && !r.leftAt);
      if (matchingIdx === -1) return current;
      const actualIdx = records.length - 1 - matchingIdx;
      const target = records[actualIdx];
      const joinedTime = new Date(target.joinedAt).getTime();
      const leftTime = new Date(nowIso).getTime();
      const durationMinutes = Math.max(1, Math.round((leftTime - joinedTime) / (1000 * 60)));

      const updated = [...records];
      updated[actualIdx] = {
        ...target,
        leftAt: nowIso,
        durationMinutes,
      };
      return {
        ...current,
        onlineAttendance: updated,
      };
    });
  }, []);

  const getOnlineAttendanceForSession = useCallback((sessionId: string) => {
    return (state.onlineAttendance || []).filter((item) => item.classSessionId === sessionId);
  }, [state.onlineAttendance]);
  const updateStudentProfile = useCallback((studentId: string, updates: Pick<LmsStudent, 'phone' | 'email' | 'address' | 'emergencyContact'>) => {
    if (!updates.email.includes('@') || !updates.phone.trim() || !updates.emergencyContact.trim()) return result(false, 'Enter a valid email, phone, and emergency contact.');

    // Write to Supabase DB
    supabase.from('students').update({
      email: updates.email, phone: updates.phone, address: updates.address, emergency_contact: updates.emergencyContact
    }).eq('id', studentId).then();

    setState((current) => ({ ...current, students: current.students.map((student) => student.id === studentId ? { ...student, ...updates } : student) }));
    return result(true, 'Profile updated.');
  }, [result]);

  const saveGoal = useCallback((input: { id?: string; studentId: string; title: string; category: string; target: string; deadline: string; progress: number }) => {
    if (!input.title.trim() || !input.target.trim() || !input.deadline || input.progress < 0 || input.progress > 100) return result(false, 'Complete all goal fields and use progress from 0 to 100.');
    const goalId = input.id || nextId('goal');
    const status = input.progress === 100 ? 'completed' : 'active';

    // Write to Supabase DB
    supabase.from('goals').upsert({
      id: goalId, student_id: input.studentId, title: input.title, category: input.category, target: input.target, deadline: input.deadline, progress: input.progress, status
    }).then();

    if (input.id) setState((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === input.id ? { ...goal, ...input, status } : goal) }));
    else setState((current) => bump({ ...current, goals: [...current.goals, { ...input, id: goalId, status }] }));
    return result(true, input.id ? 'Goal updated.' : 'Goal created.');
  }, [bump, nextId, result]);

  const deleteGoal = useCallback((id: string) => {
    supabase.from('goals').delete().eq('id', id).then();
    setState((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
    return result(true, 'Goal deleted.');
  }, [result]);

  const addEvent = useCallback((input: { title: string; date: string; type: 'class' | 'exam' | 'event' | 'holiday' | 'meeting'; batch?: string }) => {
    if (!input.title.trim() || !input.date) return result(false, 'Event title and date are required.');
    const id = nextId('event');

    supabase.from('events').insert({
      id, title: input.title, date: input.date, type: input.type, batch: input.batch || null
    }).then();

    setState((current) => bump({ ...current, events: [...current.events, { ...input, id }] }));
    return result(true, 'Event published to shared calendars.');
  }, [bump, nextId, result]);

  const addBetaProgram = useCallback((input: Omit<LmsBetaProgram, 'id'>) => {
    setState((current) => bump({ ...current, betaPrograms: [{ ...input, id: nextId('beta') }, ...current.betaPrograms] }));
    return result(true, 'Beta program added.');
  }, [bump, nextId, result]);
  
  const updateBetaProgram = useCallback((id: string, updates: Partial<LmsBetaProgram>) => {
    setState((current) => ({ ...current, betaPrograms: current.betaPrograms.map(p => p.id === id ? { ...p, ...updates } : p) }));
    return result(true, 'Beta program updated.');
  }, [result]);

  const addRoadmapFeature = useCallback((input: Omit<LmsRoadmapFeature, 'id'>) => {
    setState((current) => bump({ ...current, roadmapFeatures: [...current.roadmapFeatures, { ...input, id: nextId('roadmap') }] }));
    return result(true, 'Roadmap feature added.');
  }, [bump, nextId, result]);

  const updateRoadmapFeature = useCallback((id: string, updates: Partial<LmsRoadmapFeature>) => {
    setState((current) => ({ ...current, roadmapFeatures: current.roadmapFeatures.map(f => f.id === id ? { ...f, ...updates } : f) }));
    return result(true, 'Roadmap feature updated.');
  }, [result]);

  const addGlobalCampaign = useCallback((input: Omit<LmsGlobalCampaign, 'id'>) => {
    setState((current) => bump({ ...current, globalCampaigns: [{ ...input, id: nextId('campaign') }, ...current.globalCampaigns] }));
    return result(true, 'Campaign created.');
  }, [bump, nextId, result]);

  const updateGlobalCampaign = useCallback((id: string, updates: Partial<LmsGlobalCampaign>) => {
    setState((current) => ({ ...current, globalCampaigns: current.globalCampaigns.map(c => c.id === id ? { ...c, ...updates } : c) }));
    return result(true, 'Campaign updated.');
  }, [result]);

  const resolveExecutiveDecision = useCallback((id: string, strategy: string) => {
    setState((current) => ({ ...current, executiveDecisions: current.executiveDecisions.map(d => d.id === id ? { ...d, strategy, status: 'resolved' } : d) }));
    return result(true, 'Decision resolved and logged.');
  }, [result]);

  const searchRecords = useCallback((query: string, studentId?: string) => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const student = state.students.find((item) => item.id === studentId);
    const batchId = student?.batchId;
    return [
      ...state.courses.filter((item) => (!batchId || (item.batchIds && item.batchIds.includes(batchId))) && `${item.code} ${item.title}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'course' as const, title: item.title, subtitle: item.code, path: '/student/courses' })),
      ...state.assignments.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${state.courses.find((course) => course.id === item.courseId)?.title}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'assignment' as const, title: item.title, subtitle: 'Assignment', path: '/student/assignments' })),
      ...state.resources.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${item.description}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'resource' as const, title: item.title, subtitle: item.type, path: '/student/resources' })),
      ...state.exams.filter((item) => (!batchId || item.batchId === batchId) && `${item.title} ${item.syllabus}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'exam' as const, title: item.title, subtitle: item.date, path: '/student/exams' })),
      ...state.students.filter((item) => `${item.name} ${item.rollNo} ${item.email}`.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'student' as const, title: item.name, subtitle: item.rollNo, path: '/admin/students' })),
      ...state.batches.filter((item) => item.name.toLowerCase().includes(term)).map((item) => ({ id: item.id, type: 'batch' as const, title: item.name, subtitle: state.departments.find((department) => department.id === item.departmentId)?.name ?? 'Batch', path: '/admin/batches' })),
    ].slice(0, 12);
  }, [state]);

  const createRoleFromRequest = useCallback((requestId: string) => {
    setState((current) => {
      const request = current.roleRequests.find(r => r.id === requestId);
      if (!request) return current;
      const newRole = {
        id: nextId('role'),
        name: request.requestedRole,
        institutionId: 'institution_001', // demo
        permissions: request.requestedPermissions,
        status: 'active' as const
      };
      return bump({
        ...current,
        roleRequests: current.roleRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r),
        customRoles: [...current.customRoles, newRole]
      });
    });
    return result(true, 'Role created based on request.');
  }, [bump, nextId, result]);

  const rejectRoleRequest = useCallback((requestId: string) => {
    setState((current) => ({
      ...current,
      roleRequests: current.roleRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r)
    }));
    return result(true, 'Role request rejected.');
  }, [result]);

  const createWorkflow = useCallback((input: Omit<LmsWorkflowRule, 'id'>) => {
    setState((current) => bump({ ...current, workflows: [...current.workflows, { ...input, id: nextId('wf') } as LmsWorkflowRule] }));
    return result(true, 'Workflow created.');
  }, [bump, nextId, result]);

  const updateWorkflow = useCallback((id: string, updates: Partial<LmsWorkflowRule>) => {
    setState((current) => ({ ...current, workflows: current.workflows.map(w => w.id === id ? { ...w, ...updates } : w) }));
    return result(true, 'Workflow updated.');
  }, [result]);

  const updateIntegration = useCallback((id: string, updates: Partial<LmsIntegration>) => {
    setState((current) => ({ ...current, integrations: current.integrations.map(i => i.id === id ? { ...i, ...updates } : i) }));
    return result(true, 'Integration updated.');
  }, [result]);

  const updateBranchTheme = useCallback((id: string, updates: Partial<LmsBranchTheme>) => {
    setState((current) => ({ ...current, branchThemes: current.branchThemes.map(t => t.id === id ? { ...t, ...updates } : t) }));
    return result(true, 'Branch theme updated.');
  }, [result]);
  const updateClassStatus = useCallback((sessionId: string, status: 'scheduled' | 'live' | 'completed') => {
    supabase.from('class_sessions').update({ status }).eq('id', sessionId).then();
    setState((current) => ({
      ...current,
      classSessions: current.classSessions.map((item) => item.id === sessionId ? { ...item, status } : item)
    }));
    return result(true, `Class status updated to ${status}.`);
  }, [result]);

  const updateLeaveStatus = useCallback((leaveId: string, status: 'approved' | 'rejected') => {
    const leave = state.leaveRequests.find((l) => l.id === leaveId);
    try {
      supabase.from('leave_requests').update({ status }).eq('id', leaveId).then(() => {}, () => {});
    } catch {}
    
    // Notify student if found
    const student = state.students.find((s) => s.name.toLowerCase() === leave?.studentName.toLowerCase());
    if (student) {
      const notifId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'notif_' + Date.now();
      try {
        supabase.from('notifications').insert({
          id: notifId, user_id: student.id, type: 'academic', title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`, message: `Your leave request for ${leave?.leaveFrom} to ${leave?.leaveTo} has been ${status}.`, timestamp: DEMO_NOW, read: false, path: '/student/leaves'
        }).then(() => {}, () => {});
      } catch {}
      setState((current) => bump({
        ...current,
        leaveRequests: current.leaveRequests.map((l) => l.id === leaveId ? { ...l, status } : l),
        notifications: [...current.notifications, { id: notifId, userId: student.id, type: 'academic', title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`, message: `Your leave request for ${leave?.leaveFrom} to ${leave?.leaveTo} has been ${status}.`, timestamp: DEMO_NOW, read: false, path: '/student/leaves' }]
      }));
    } else {
      setState((current) => bump({
        ...current,
        leaveRequests: current.leaveRequests.map((l) => l.id === leaveId ? { ...l, status } : l)
      }));
    }
    return result(true, `Leave request has been ${status}.`);
  }, [bump, result, state.leaveRequests, state.students]);

  const requestLeave = useCallback((input: { studentName: string; batch: string; leaveFrom: string; leaveTo: string; reason: string; requesterType?: string; teacherName?: string }) => {
    if (!input.leaveFrom || !input.leaveTo || !input.reason.trim()) {
      return result(false, 'Please fill in all leave details.');
    }
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'leave_' + Date.now();
    const nowStr = new Date().toISOString();
    const newLeave: LmsLeaveRequest = {
      id,
      studentName: input.studentName,
      batch: input.batch || 'General',
      leaveFrom: input.leaveFrom,
      leaveTo: input.leaveTo,
      reason: input.reason.trim(),
      status: 'pending',
      requesterType: input.requesterType || 'student',
      teacherName: input.teacherName || null,
      createdAt: nowStr,
    };

    try {
      supabase.from('leave_requests').insert({
        id,
        student_name: newLeave.studentName,
        batch: newLeave.batch,
        leave_from: newLeave.leaveFrom,
        leave_to: newLeave.leaveTo,
        reason: newLeave.reason,
        status: 'pending',
        requester_type: newLeave.requesterType,
        teacher_name: newLeave.teacherName,
        created_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      leaveRequests: [newLeave, ...(current.leaveRequests || [])]
    }));
    return result(true, 'Leave request submitted successfully.');
  }, [bump, result]);

  const createForumPost = useCallback((content: string, tags: string[], authorName: string, authorRole: string) => {
    if (!content.trim()) return result(false, 'Post content cannot be empty.');
    
    // Generate valid UUID string for Supabase compatibility
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });

    const nowStr = new Date().toISOString();
    const safeTags = (tags && tags.length > 0) ? tags : ['General'];

    try {
      supabase.from('forum_posts').insert({
        id,
        author_name: authorName,
        author_role: authorRole,
        content: content.trim(),
        tags: safeTags,
        likes: 0,
        comments: 0,
        created_at: nowStr,
      }).then(() => {}, () => {});
    } catch {
      // Ignore Supabase error if offline
    }

    setState((current) => bump({
      ...current,
      forumPosts: [
        { id, authorName, authorRole, content: content.trim(), tags: safeTags, likes: 0, comments: 0, createdAt: nowStr },
        ...(current.forumPosts || [])
      ]
    }));
    return result(true, 'Post published to the discussion forum.');
  }, [bump, result]);

  const likeForumPost = useCallback((postId: string) => {
    setState((current) => {
      const updated = (current.forumPosts || []).map((p) => {
        if (p.id === postId) {
          const nextLikes = p.likes + 1;
            try {
              supabase.from('forum_posts').update({ likes: nextLikes }).eq('id', postId).then(() => {}, () => {});
            } catch {}
          return { ...p, likes: nextLikes };
        }
        return p;
      });
      return bump({ ...current, forumPosts: updated });
    });
    return result(true, 'Post liked.');
  }, [bump, result]);

  const commentForumPost = useCallback((postId: string) => {
    setState((current) => {
      const updated = (current.forumPosts || []).map((p) => {
        if (p.id === postId) {
          const nextComments = p.comments + 1;
            try {
              supabase.from('forum_posts').update({ comments: nextComments }).eq('id', postId).then(() => {}, () => {});
            } catch {}
          return { ...p, comments: nextComments };
        }
        return p;
      });
      return bump({ ...current, forumPosts: updated });
    });
    return result(true, 'Comment count updated.');
  }, [bump, result]);

  const sendCommunityMessage = useCallback((msgInput: Omit<LmsCommunityMessage, 'id' | 'createdAt'>) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    const newMsg: LmsCommunityMessage = {
      ...msgInput,
      id,
      createdAt,
      reactions: msgInput.reactions || {},
      readBy: msgInput.readBy || [msgInput.senderId],
    };

    // 1. Write to Supabase DB
    try {
      supabase.from('community_messages').upsert({
        id,
        batch_id: newMsg.batchId,
        sender_id: newMsg.senderId,
        sender_name: newMsg.senderName,
        sender_role: newMsg.senderRole,
        sender_avatar: newMsg.senderAvatar,
        message_text: newMsg.messageText,
        message_type: newMsg.messageType,
        attachment_url: newMsg.attachmentUrl || '',
        attachment_name: newMsg.attachmentName || '',
        reply_to_id: newMsg.replyToId || '',
        reply_to_sender_name: newMsg.replyToSenderName || '',
        reply_to_text: newMsg.replyToText || '',
        is_pinned: newMsg.isPinned || false,
        reactions: newMsg.reactions,
        read_by: newMsg.readBy,
        announcement_title: newMsg.announcementTitle || '',
        announcement_target: newMsg.announcementTarget || '',
        announcement_date: newMsg.announcementDate || '',
        created_at: createdAt,
      }).then(() => {}, () => {});
    } catch {}

    // 2. Broadcast via BroadcastChannel across local tabs
    try {
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'NEW_COMMUNITY_MESSAGE', payload: newMsg });
      bc.close();
    } catch {}

    // 3. Update local state
    setState((current) => bump({
      ...current,
      communityMessages: [...(current.communityMessages || []), newMsg],
    }));

    return result(true, 'Message sent.');
  }, [bump, result]);

  const toggleMessageReaction = useCallback((messageId: string, emoji: string, userId: string) => {
    let updatedMsg: LmsCommunityMessage | null = null;

    setState((current) => {
      const updatedMessages = (current.communityMessages || []).map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const index = userList.indexOf(userId);

        if (index >= 0) {
          userList.splice(index, 1);
        } else {
          userList.push(userId);
        }

        if (userList.length > 0) {
          currentReactions[emoji] = userList;
        } else {
          delete currentReactions[emoji];
        }

        updatedMsg = { ...m, reactions: currentReactions };
        return updatedMsg;
      });

      return bump({ ...current, communityMessages: updatedMessages });
    });

    if (updatedMsg) {
      try {
        supabase.from('community_messages').update({ reactions: (updatedMsg as any).reactions }).eq('id', messageId).then(() => {}, () => {});
        const bc = new BroadcastChannel('skilltoss_community_channel');
        bc.postMessage({ type: 'UPDATE_COMMUNITY_MESSAGE', payload: updatedMsg });
        bc.close();
      } catch {}
    }

    return result(true, 'Reaction updated.');
  }, [bump, result]);

  const pinCommunityMessage = useCallback((messageId: string, isPinned: boolean) => {
    let updatedMsg: LmsCommunityMessage | null = null;

    setState((current) => {
      const updatedMessages = (current.communityMessages || []).map((m) => {
        if (m.id !== messageId) return m;
        updatedMsg = { ...m, isPinned };
        return updatedMsg;
      });
      return bump({ ...current, communityMessages: updatedMessages });
    });

    if (updatedMsg) {
      try {
        supabase.from('community_messages').update({ is_pinned: isPinned }).eq('id', messageId).then(() => {}, () => {});
        const bc = new BroadcastChannel('skilltoss_community_channel');
        bc.postMessage({ type: 'UPDATE_COMMUNITY_MESSAGE', payload: updatedMsg });
        bc.close();
      } catch {}
    }

    return result(true, isPinned ? 'Message pinned.' : 'Message unpinned.');
  }, [bump, result]);

  const deleteCommunityMessage = useCallback((messageId: string) => {
    setState((current) => ({
      ...current,
      communityMessages: (current.communityMessages || []).filter((m) => m.id !== messageId),
    }));

    try {
      supabase.from('community_messages').delete().eq('id', messageId).then(() => {}, () => {});
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'DELETE_COMMUNITY_MESSAGE', payload: { id: messageId } });
      bc.close();
    } catch {}

    return result(true, 'Message deleted.');
  }, [result]);

  const editCommunityMessage = useCallback((messageId: string, newText: string) => {
    if (!newText.trim()) return result(false, 'Message text cannot be empty.');
    let updatedMsg: LmsCommunityMessage | null = null;
    const editedAt = new Date().toISOString();

    setState((current) => {
      const updatedMessages = (current.communityMessages || []).map((m) => {
        if (m.id !== messageId) return m;
        updatedMsg = { ...m, messageText: newText.trim(), editedAt };
        return updatedMsg;
      });
      return bump({ ...current, communityMessages: updatedMessages });
    });

    if (updatedMsg) {
      try {
        supabase.from('community_messages').update({ message_text: newText.trim(), edited_at: editedAt }).eq('id', messageId).then(() => {}, () => {});
        const bc = new BroadcastChannel('skilltoss_community_channel');
        bc.postMessage({ type: 'UPDATE_COMMUNITY_MESSAGE', payload: updatedMsg });
        bc.close();
      } catch {}
    }

    return result(true, 'Message edited successfully.');
  }, [bump, result]);

  const markCommunityChannelAsRead = useCallback((batchId: string, userId: string) => {
    setState((current) => {
      const updatedMessages = (current.communityMessages || []).map((m) => {
        if (m.batchId === batchId && (!m.readBy || !m.readBy.includes(userId))) {
          const newReadBy = [...(m.readBy || []), userId];
            try {
              supabase.from('community_messages').update({ read_by: newReadBy }).eq('id', m.id).then(() => {}, () => {});
            } catch {}
          return { ...m, readBy: newReadBy };
        }
        return m;
      });
      return { ...current, communityMessages: updatedMessages };
    });
  }, []);

  const onlineStudentIds = useMemo(() => {
    return state.students.filter((s, index) => s.status === 'active' && index % 3 !== 0).map((s) => s.id);
  }, [state.students]);

  const sendBatchAnnouncement = useCallback((batchId: string, title: string, messageText: string, teacherName: string) => {
    const id = nextId('cmsg');
    const createdAt = new Date().toISOString();
    const newMsg: LmsCommunityMessage = {
      id,
      batchId,
      senderId: 'teacher_001',
      senderName: teacherName || 'Faculty',
      senderRole: 'teacher',
      senderAvatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName || 'Faculty')}`,
      messageText,
      messageType: 'announcement',
      announcementTitle: title,
      announcementDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt,
      readBy: ['teacher_001'],
    };

    const targetStudents = state.students.filter((s) => s.batchId === batchId);
    const newNotifs: LmsNotification[] = targetStudents.map((s) => ({
      id: `notif_ann_${Date.now()}_${s.id}`,
      userId: s.id,
      type: 'announcement',
      title: `📢 ${title}`,
      message: messageText,
      timestamp: createdAt,
      read: false,
      relatedEntityId: batchId,
    }));

    try {
      supabase.from('community_messages').upsert({
        id,
        batch_id: newMsg.batchId,
        sender_id: newMsg.senderId,
        sender_name: newMsg.senderName,
        sender_role: newMsg.senderRole,
        sender_avatar: newMsg.senderAvatar,
        message_text: newMsg.messageText,
        message_type: newMsg.messageType,
        announcement_title: title,
        announcement_date: newMsg.announcementDate,
        created_at: createdAt,
      }).then(() => {}, () => {});

      if (newNotifs.length > 0) {
        supabase.from('notifications').upsert(newNotifs.map((n) => ({
          id: n.id,
          user_id: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
          related_entity_id: n.relatedEntityId,
        }))).then(() => {}, () => {});
      }
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'NEW_COMMUNITY_MESSAGE', payload: newMsg });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      communityMessages: [...(current.communityMessages || []), newMsg],
      notifications: [...(current.notifications || []), ...newNotifs],
    }));

    return result(true, 'Announcement posted successfully.');
  }, [bump, nextId, result, state.students]);

  const createCommunityPost = useCallback((post: {
    title: string; content: string; postType: 'question' | 'discussion';
    authorId: string; authorName: string; authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
    authorAvatar?: string; category: string; tags: string[]; batchId?: string; departmentId?: string;
    attachmentUrl?: string; attachmentName?: string;
  }) => {
    if (!post.title.trim() || !post.content.trim()) return result(false, 'Title and description are required.');
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString();
    const newPost: CommunityPost = {
      id,
      title: post.title.trim(),
      content: post.content.trim(),
      postType: post.postType,
      authorId: post.authorId,
      authorName: post.authorName,
      authorRole: post.authorRole,
      authorAvatar: post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`,
      category: post.category || 'General',
      tags: post.tags && post.tags.length > 0 ? post.tags : ['General'],
      batchId: post.batchId || '',
      departmentId: post.departmentId || '',
      attachmentUrl: post.attachmentUrl || '',
      attachmentName: post.attachmentName || '',
      isPinned: false,
      isSolved: false,
      bestAnswerId: '',
      viewsCount: 0,
      upvotesCount: 0,
      answersCount: 0,
      isHidden: false,
      createdAt: nowStr,
    };

    try {
      supabase.from('community_posts').insert({
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        post_type: newPost.postType,
        author_id: newPost.authorId,
        author_name: newPost.authorName,
        author_role: newPost.authorRole,
        author_avatar: newPost.authorAvatar,
        category: newPost.category,
        tags: newPost.tags,
        batch_id: newPost.batchId,
        department_id: newPost.departmentId,
        attachment_url: newPost.attachmentUrl,
        attachment_name: newPost.attachmentName,
        is_pinned: false,
        is_solved: false,
        best_answer_id: '',
        views_count: 0,
        upvotes_count: 0,
        answers_count: 0,
        is_hidden: false,
        created_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'NEW_COMMUNITY_POST', payload: newPost });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      communityPosts: [newPost, ...(current.communityPosts || [])],
    }));

    return result(true, `${post.postType === 'question' ? 'Question' : 'Discussion'} published successfully.`);
  }, [bump, result]);

  const editCommunityPost = useCallback((id: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }) => {
    let updatedPost: CommunityPost | null = null;
    setState((current) => {
      const updated = (current.communityPosts || []).map((p) => {
        if (p.id !== id) return p;
        updatedPost = {
          ...p,
          title: updates.title !== undefined ? updates.title.trim() : p.title,
          content: updates.content !== undefined ? updates.content.trim() : p.content,
          category: updates.category !== undefined ? updates.category : p.category,
          tags: updates.tags !== undefined ? updates.tags : p.tags,
          updatedAt: new Date().toISOString(),
        };
        return updatedPost;
      });
      return bump({ ...current, communityPosts: updated });
    });

    if (updatedPost) {
      try {
        supabase.from('community_posts').update({
          title: (updatedPost as CommunityPost).title,
          content: (updatedPost as CommunityPost).content,
          category: (updatedPost as CommunityPost).category,
          tags: (updatedPost as CommunityPost).tags,
          updated_at: new Date().toISOString(),
        }).eq('id', id).then(() => {}, () => {});
      } catch {}
    }

    return result(true, 'Post updated.');
  }, [bump, result]);

  const deleteCommunityPost = useCallback((id: string) => {
    setState((current) => bump({
      ...current,
      communityPosts: (current.communityPosts || []).filter((p) => p.id !== id),
      communityAnswers: (current.communityAnswers || []).filter((a) => a.postId !== id),
    }));

    try {
      supabase.from('community_posts').delete().eq('id', id).then(() => {}, () => {});
    } catch {}

    return result(true, 'Post deleted.');
  }, [bump, result]);

  const addCommunityAnswer = useCallback((input: {
    postId: string; authorId: string; authorName: string;
    authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
    authorAvatar?: string; content: string; parentAnswerId?: string;
  }) => {
    if (!input.content.trim()) return result(false, 'Answer content cannot be empty.');
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString();
    const newAnswer: CommunityAnswer = {
      id,
      postId: input.postId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      authorAvatar: input.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.authorName)}`,
      content: input.content.trim(),
      upvotesCount: 0,
      isBestAnswer: false,
      parentAnswerId: input.parentAnswerId || '',
      isHidden: false,
      createdAt: nowStr,
    };

    try {
      supabase.from('community_answers').insert({
        id: newAnswer.id,
        post_id: newAnswer.postId,
        author_id: newAnswer.authorId,
        author_name: newAnswer.authorName,
        author_role: newAnswer.authorRole,
        author_avatar: newAnswer.authorAvatar,
        content: newAnswer.content,
        upvotes_count: 0,
        is_best_answer: false,
        parent_answer_id: newAnswer.parentAnswerId || '',
        is_hidden: false,
        created_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'NEW_COMMUNITY_ANSWER', payload: newAnswer });
      bc.close();
    } catch {}

    setState((current) => {
      const answers = [...(current.communityAnswers || []), newAnswer];
      const posts = (current.communityPosts || []).map((p) => {
        if (p.id === input.postId) {
          const nextCount = p.answersCount + 1;
          try {
            supabase.from('community_posts').update({ answers_count: nextCount }).eq('id', input.postId).then(() => {}, () => {});
          } catch {}
          return { ...p, answersCount: nextCount };
        }
        return p;
      });
      return bump({ ...current, communityAnswers: answers, communityPosts: posts });
    });

    return result(true, 'Answer submitted.');
  }, [bump, result]);

  const toggleCommunityUpvote = useCallback((userId: string, targetType: 'post' | 'answer', targetId: string) => {
    setState((current) => {
      const existing = (current.communityUpvotes || []).find((u) => u.userId === userId && u.targetType === targetType && u.targetId === targetId);
      let newUpvotes = [...(current.communityUpvotes || [])];

      if (existing) {
        newUpvotes = newUpvotes.filter((u) => u.id !== existing.id);
        try {
          supabase.from('community_upvotes').delete().eq('id', existing.id).then(() => {}, () => {});
        } catch {}
      } else {
        const id = `up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const up: CommunityUpvote = { id, userId, targetType, targetId, createdAt: new Date().toISOString() };
        newUpvotes.push(up);
        try {
          supabase.from('community_upvotes').insert({ id, user_id: userId, target_type: targetType, target_id: targetId }).then(() => {}, () => {});
        } catch {}
      }

      let posts = current.communityPosts || [];
      let answers = current.communityAnswers || [];

      if (targetType === 'post') {
        posts = posts.map((p) => {
          if (p.id === targetId) {
            const upvotesCount = Math.max(0, p.upvotesCount + (existing ? -1 : 1));
            try {
              supabase.from('community_posts').update({ upvotes_count: upvotesCount }).eq('id', targetId).then(() => {}, () => {});
            } catch {}
            return { ...p, upvotesCount };
          }
          return p;
        });
      } else {
        answers = answers.map((a) => {
          if (a.id === targetId) {
            const upvotesCount = Math.max(0, a.upvotesCount + (existing ? -1 : 1));
            try {
              supabase.from('community_answers').update({ upvotes_count: upvotesCount }).eq('id', targetId).then(() => {}, () => {});
            } catch {}
            return { ...a, upvotesCount };
          }
          return a;
        });
      }

      return bump({
        ...current,
        communityUpvotes: newUpvotes,
        communityPosts: posts,
        communityAnswers: answers,
      });
    });

    return result(true, 'Upvote updated.');
  }, [bump, result]);

  const toggleCommunityBookmark = useCallback((userId: string, postId: string) => {
    setState((current) => {
      const existing = (current.communityBookmarks || []).find((b) => b.userId === userId && b.postId === postId);
      let newBookmarks = [...(current.communityBookmarks || [])];

      if (existing) {
        newBookmarks = newBookmarks.filter((b) => b.id !== existing.id);
        try {
          supabase.from('community_bookmarks').delete().eq('id', existing.id).then(() => {}, () => {});
        } catch {}
      } else {
        const id = `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const bm: CommunityBookmark = { id, userId, postId, createdAt: new Date().toISOString() };
        newBookmarks.push(bm);
        try {
          supabase.from('community_bookmarks').insert({ id, user_id: userId, post_id: postId }).then(() => {}, () => {});
        } catch {}
      }

      return bump({ ...current, communityBookmarks: newBookmarks });
    });

    return result(true, 'Saved items updated.');
  }, [bump, result]);

  const toggleCommunityFollow = useCallback((userId: string, postId: string) => {
    setState((current) => {
      const existing = (current.communityFollows || []).find((f) => f.userId === userId && f.postId === postId);
      let newFollows = [...(current.communityFollows || [])];

      if (existing) {
        newFollows = newFollows.filter((f) => f.id !== existing.id);
        try {
          supabase.from('community_follows').delete().eq('id', existing.id).then(() => {}, () => {});
        } catch {}
      } else {
        const id = `fl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const fl: CommunityFollow = { id, userId, postId, createdAt: new Date().toISOString() };
        newFollows.push(fl);
        try {
          supabase.from('community_follows').insert({ id, user_id: userId, post_id: postId }).then(() => {}, () => {});
        } catch {}
      }

      return bump({ ...current, communityFollows: newFollows });
    });

    return result(true, 'Follow preferences updated.');
  }, [bump, result]);

  const markBestAnswer = useCallback((postId: string, answerId: string | null) => {
    setState((current) => {
      const isSolved = Boolean(answerId);
      const posts = (current.communityPosts || []).map((p) => {
        if (p.id === postId) {
          try {
            supabase.from('community_posts').update({ is_solved: isSolved, best_answer_id: answerId || '' }).eq('id', postId).then(() => {}, () => {});
          } catch {}
          return { ...p, isSolved, bestAnswerId: answerId || '' };
        }
        return p;
      });

      const answers = (current.communityAnswers || []).map((a) => {
        if (a.postId === postId) {
          const isBest = a.id === answerId;
          try {
            supabase.from('community_answers').update({ is_best_answer: isBest }).eq('id', a.id).then(() => {}, () => {});
          } catch {}
          return { ...a, isBestAnswer: isBest };
        }
        return a;
      });

      return bump({ ...current, communityPosts: posts, communityAnswers: answers });
    });

    return result(true, answerId ? 'Marked as Best Answer! Question marked as Solved.' : 'Best Answer cleared.');
  }, [bump, result]);

  const reportCommunityContent = useCallback((input: {
    reporterId: string; reporterName: string; targetType: 'post' | 'answer'; targetId: string; postId: string; reason: string; details?: string;
  }) => {
    const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const report: CommunityReport = {
      id,
      reporterId: input.reporterId,
      reporterName: input.reporterName,
      targetType: input.targetType,
      targetId: input.targetId,
      postId: input.postId,
      reason: input.reason,
      details: input.details || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      supabase.from('community_reports').insert({
        id,
        reporter_id: report.reporterId,
        reporter_name: report.reporterName,
        target_type: report.targetType,
        target_id: report.targetId,
        post_id: report.postId,
        reason: report.reason,
        details: report.details,
        status: 'pending',
        created_at: report.createdAt,
      }).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      communityReports: [report, ...(current.communityReports || [])],
    }));

    return result(true, 'Report submitted for administrator review.');
  }, [bump, result]);

  const adminModerateReport = useCallback((reportId: string, action: 'dismiss' | 'hide' | 'delete' | 'restore') => {
    setState((current) => {
      const rep = (current.communityReports || []).find((r) => r.id === reportId);
      if (!rep) return current;

      const reports = (current.communityReports || []).map((r) => r.id === reportId ? { ...r, status: (action === 'dismiss' ? 'dismissed' : 'actioned') as CommunityReport['status'] } : r);
      let posts = current.communityPosts || [];
      let answers = current.communityAnswers || [];

      if (action === 'hide') {
        if (rep.targetType === 'post') {
          posts = posts.map((p) => p.id === rep.targetId ? { ...p, isHidden: true } : p);
        } else {
          answers = answers.map((a) => a.id === rep.targetId ? { ...a, isHidden: true } : a);
        }
      } else if (action === 'restore') {
        if (rep.targetType === 'post') {
          posts = posts.map((p) => p.id === rep.targetId ? { ...p, isHidden: false } : p);
        } else {
          answers = answers.map((a) => a.id === rep.targetId ? { ...a, isHidden: false } : a);
        }
      } else if (action === 'delete') {
        if (rep.targetType === 'post') {
          posts = posts.filter((p) => p.id !== rep.targetId);
          answers = answers.filter((a) => a.postId !== rep.targetId);
        } else {
          answers = answers.filter((a) => a.id !== rep.targetId);
        }
      }

      try {
        supabase.from('community_reports').update({ status: action === 'dismiss' ? 'dismissed' : 'actioned' }).eq('id', reportId).then(() => {}, () => {});
        if (action === 'hide' || action === 'restore') {
          const table = rep.targetType === 'post' ? 'community_posts' : 'community_answers';
          supabase.from(table).update({ is_hidden: action === 'hide' }).eq('id', rep.targetId).then(() => {}, () => {});
        } else if (action === 'delete') {
          const table = rep.targetType === 'post' ? 'community_posts' : 'community_answers';
          supabase.from(table).delete().eq('id', rep.targetId).then(() => {}, () => {});
        }
      } catch {}

      return bump({ ...current, communityReports: reports, communityPosts: posts, communityAnswers: answers });
    });

    return result(true, `Moderation action (${action}) performed.`);
  }, [bump, result]);

  const togglePinCommunityPost = useCallback((postId: string) => {
    let nextPinned = false;
    setState((current) => {
      const posts = (current.communityPosts || []).map((p) => {
        if (p.id === postId) {
          nextPinned = !p.isPinned;
          try {
            supabase.from('community_posts').update({ is_pinned: nextPinned }).eq('id', postId).then(() => {}, () => {});
          } catch {}
          return { ...p, isPinned: nextPinned };
        }
        return p;
      });
      return bump({ ...current, communityPosts: posts });
    });

    return result(true, nextPinned ? 'Discussion pinned.' : 'Discussion unpinned.');
  }, [bump, result]);

  // ====================================================
  // COURSE MANAGEMENT SYSTEM ACTIONS & REAL-TIME SYNC
  // ====================================================
  const saveCourseDraft = useCallback((courseInput: Partial<LmsCourse>, inputModules: CourseModule[], inputLessons: CourseLesson[]) => {
    const id = courseInput.id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString();

    const fullCourse: LmsCourse = {
      id,
      code: courseInput.code || 'CS-101',
      title: courseInput.title || 'Untitled Course',
      description: courseInput.description || '',
      category: courseInput.category || 'General',
      departmentId: courseInput.departmentId || 'dept_cs',
      level: courseInput.level || 'Beginner',
      durationHours: courseInput.durationHours || 10,
      price: courseInput.price || 0,
      instructorId: courseInput.instructorId || 'teacher_001',
      instructorName: courseInput.instructorName || 'Faculty',
      instructorRole: courseInput.instructorRole || 'teacher',
      thumbnail: courseInput.thumbnail || 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600',
      learningObjectives: courseInput.learningObjectives || [],
      prerequisites: courseInput.prerequisites || [],
      skillsGained: courseInput.skillsGained || [],
      version: courseInput.version || '1.0',
      status: (courseInput.status as CourseStatus) || 'DRAFT',
      adminFeedback: courseInput.adminFeedback || '',
      enrolledCount: courseInput.enrolledCount || 0,
      createdAt: courseInput.createdAt || nowStr,
      updatedAt: nowStr,
    };

    try {
      supabase.from('courses').upsert({
        id: fullCourse.id,
        code: fullCourse.code,
        title: fullCourse.title,
        description: fullCourse.description,
        category: fullCourse.category,
        department_id: fullCourse.departmentId,
        level: fullCourse.level,
        duration_hours: fullCourse.durationHours,
        instructor_id: fullCourse.instructorId,
        instructor_name: fullCourse.instructorName,
        instructor_role: fullCourse.instructorRole,
        thumbnail: fullCourse.thumbnail,
        learning_objectives: fullCourse.learningObjectives,
        prerequisites: fullCourse.prerequisites,
        skills_gained: fullCourse.skillsGained,
        version: fullCourse.version,
        status: fullCourse.status,
        admin_feedback: fullCourse.adminFeedback,
        enrolled_count: fullCourse.enrolledCount,
        price: fullCourse.price,
        updated_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_courses_channel');
      bc.postMessage({ type: 'UPDATE_COURSE', payload: fullCourse });
      bc.close();
    } catch {}

    setState((current) => {
      const existingIdx = (current.courses || []).findIndex((c) => c.id === id);
      let newCourses = [...(current.courses || [])];
      if (existingIdx >= 0) {
        newCourses[existingIdx] = fullCourse;
      } else {
        newCourses = [fullCourse, ...newCourses];
      }

      // Merge modules & lessons
      const existingModules = (current.courseModules || []).filter((m) => m.courseId !== id);
      const existingLessons = (current.courseLessons || []).filter((l) => l.courseId !== id);

      return bump({
        ...current,
        courses: newCourses,
        courseModules: [...existingModules, ...inputModules],
        courseLessons: [...existingLessons, ...inputLessons],
      });
    });

    return result(true, `Course "${fullCourse.title}" draft saved.`);
  }, [bump, result]);

  const submitCourseForReview = useCallback((courseId: string) => {
    let targetCourse: LmsCourse | null = null;

    setState((current) => {
      const courses = (current.courses || []).map((c) => {
        if (c.id === courseId) {
          targetCourse = { ...c, status: 'PENDING_REVIEW' as CourseStatus, updatedAt: new Date().toISOString() };
          return targetCourse;
        }
        return c;
      });
      return bump({ ...current, courses });
    });

    if (targetCourse) {
      try {
        supabase.from('courses').update({ status: 'PENDING_REVIEW', updated_at: new Date().toISOString() }).eq('id', courseId).then(() => {}, () => {});
      } catch {}

      // Notify Admins
      const notifId = `notif_rev_${Date.now()}`;
      const nowStr = new Date().toISOString();
      const newNotif: LmsNotification = {
        id: notifId,
        userId: 'admin',
        type: 'academic',
        title: '📋 Course Review Submitted',
        message: `${(targetCourse as LmsCourse).instructorName} submitted "${(targetCourse as LmsCourse).title}" for review.`,
        timestamp: nowStr,
        read: false,
        path: '/admin/courses',
      };

      try {
        supabase.from('notifications').insert({
          id: notifId, user_id: 'admin', type: 'academic', title: newNotif.title, message: newNotif.message, timestamp: nowStr, read: false, path: '/admin/courses'
        }).then(() => {}, () => {});
      } catch {}

      try {
        const bc = new BroadcastChannel('skilltoss_courses_channel');
        bc.postMessage({ type: 'COURSE_PENDING_REVIEW', payload: targetCourse });
        bc.close();
      } catch {}
    }

    return result(true, 'Course submitted for admin review.');
  }, [bump, result]);

  const adminReviewCourse = useCallback((
    courseId: string,
    action: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'PUBLISHED',
    feedback?: string,
    reviewerName: string = 'Admin'
  ) => {
    let targetCourse: LmsCourse | null = null;
    const nowStr = new Date().toISOString();

    setState((current) => {
      const courses = (current.courses || []).map((c) => {
        if (c.id === courseId) {
          targetCourse = {
            ...c,
            status: action as CourseStatus,
            adminFeedback: feedback || c.adminFeedback || '',
            updatedAt: nowStr,
          };
          return targetCourse;
        }
        return c;
      });
      return bump({ ...current, courses });
    });

    if (targetCourse) {
      try {
        supabase.from('courses').update({
          status: action,
          admin_feedback: feedback || '',
          updated_at: nowStr,
        }).eq('id', courseId).then(() => {}, () => {});

        supabase.from('course_reviews').insert({
          id: `rev_${Date.now()}`,
          course_id: courseId,
          reviewer_id: 'admin_001',
          reviewer_name: reviewerName,
          action,
          feedback: feedback || '',
          created_at: nowStr,
        }).then(() => {}, () => {});
      } catch {}

      // Create notifications for Teacher & Students
      const notifTitle =
        action === 'APPROVED' ? '🟢 Course Approved' :
        action === 'CHANGES_REQUESTED' ? '🟠 Changes Requested on Course' :
        action === 'PUBLISHED' ? '🔔 New Course Published' : '❌ Course Review Decision';

      const notifMsg =
        action === 'CHANGES_REQUESTED' ? `Admin requested changes for "${(targetCourse as LmsCourse).title}": ${feedback}` :
        action === 'PUBLISHED' ? `Course "${(targetCourse as LmsCourse).title}" by ${(targetCourse as LmsCourse).instructorName} has been published and is now available.` :
        `Your course "${(targetCourse as LmsCourse).title}" review status was updated to ${action}.`;

      const notifIdTeacher = `notif_crs_t_${Date.now()}`;
      const notifIdStudent = `notif_crs_s_${Date.now()}`;

      const newNotifs: LmsNotification[] = [
        {
          id: notifIdTeacher,
          userId: (targetCourse as LmsCourse).instructorId || 'teacher',
          type: 'academic',
          title: notifTitle,
          message: notifMsg,
          timestamp: nowStr,
          read: false,
          path: '/teacher/courses',
        }
      ];

      if (action === 'PUBLISHED') {
        newNotifs.push({
          id: notifIdStudent,
          userId: 'student_001',
          type: 'academic',
          title: '🔔 New Course Published',
          message: `"${(targetCourse as LmsCourse).title}" is now available in My Courses!`,
          timestamp: nowStr,
          read: false,
          path: '/student/courses',
        });
      }

      try {
        supabase.from('notifications').insert(newNotifs.map((n) => ({
          id: n.id, user_id: n.userId, type: n.type, title: n.title, message: n.message, timestamp: nowStr, read: false, path: n.path
        }))).then(() => {}, () => {});
      } catch {}

      setState((current) => bump({
        ...current,
        notifications: [...current.notifications, ...newNotifs]
      }));

      try {
        const bc = new BroadcastChannel('skilltoss_courses_channel');
        bc.postMessage({ type: 'COURSE_STATUS_CHANGED', payload: { course: targetCourse, action, feedback } });
        bc.close();
      } catch {}
    }

    return result(true, `Course decision (${action}) recorded successfully.`);
  }, [bump, result]);

  const addCourseModule = useCallback((courseId: string, title: string) => {
    const id = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMod: CourseModule = { id, courseId, title, sortOrder: Date.now(), lessons: [] };

    try {
      supabase.from('course_modules').insert({ id, course_id: courseId, title, sort_order: newMod.sortOrder }).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseModules: [...(current.courseModules || []), newMod]
    }));
    return result(true, 'Module added.');
  }, [bump, result]);

  const updateCourseModule = useCallback((moduleId: string, title: string) => {
    try {
      supabase.from('course_modules').update({ title }).eq('id', moduleId).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseModules: (current.courseModules || []).map((m) => m.id === moduleId ? { ...m, title } : m)
    }));
    return result(true, 'Module updated.');
  }, [bump, result]);

  const deleteCourseModule = useCallback((moduleId: string) => {
    try {
      supabase.from('course_modules').delete().eq('id', moduleId).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseModules: (current.courseModules || []).filter((m) => m.id !== moduleId),
      courseLessons: (current.courseLessons || []).filter((l) => l.moduleId !== moduleId)
    }));
    return result(true, 'Module deleted.');
  }, [bump, result]);

  const addCourseLesson = useCallback((input: Omit<CourseLesson, 'id'>) => {
    const id = `les_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLesson: CourseLesson = { ...input, id };

    try {
      supabase.from('course_lessons').insert({
        id,
        course_id: newLesson.courseId,
        module_id: newLesson.moduleId,
        title: newLesson.title,
        lesson_type: newLesson.lessonType,
        description: newLesson.description || '',
        video_url: newLesson.videoUrl || '',
        resource_url: newLesson.resourceUrl || '',
        file_name: newLesson.fileName || '',
        file_size: newLesson.fileSize || 0,
        rich_text: newLesson.richText || '',
        coding_problem: newLesson.codingProblem || {},
        quiz_data: newLesson.quizData || {},
        assignment_data: newLesson.assignmentData || {},
        duration_minutes: newLesson.durationMinutes || 10,
        sort_order: newLesson.sortOrder || 0,
      }).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseLessons: [...(current.courseLessons || []), newLesson]
    }));
    return result(true, 'Lesson created.');
  }, [bump, result]);

  const updateCourseLesson = useCallback((lessonId: string, updates: Partial<CourseLesson>) => {
    setState((current) => {
      const updatedLessons = (current.courseLessons || []).map((l) => {
        if (l.id !== lessonId) return l;
        const updated = { ...l, ...updates };
        try {
          supabase.from('course_lessons').update({
            title: updated.title,
            lesson_type: updated.lessonType,
            description: updated.description || '',
            video_url: updated.videoUrl || '',
            resource_url: updated.resourceUrl || '',
            file_name: updated.fileName || '',
            file_size: updated.fileSize || 0,
            rich_text: updated.richText || '',
            coding_problem: updated.codingProblem || {},
            quiz_data: updated.quizData || {},
            assignment_data: updated.assignmentData || {},
            duration_minutes: updated.durationMinutes || 10,
          }).eq('id', lessonId).then(() => {}, () => {});
        } catch {}
        return updated;
      });
      return bump({ ...current, courseLessons: updatedLessons });
    });
    return result(true, 'Lesson updated.');
  }, [bump, result]);

  const deleteCourseLesson = useCallback((lessonId: string) => {
    try {
      supabase.from('course_lessons').delete().eq('id', lessonId).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseLessons: (current.courseLessons || []).filter((l) => l.id !== lessonId)
    }));
    return result(true, 'Lesson deleted.');
  }, [bump, result]);

  const enrollStudentInCourse = useCallback((studentId: string, courseId: string) => {
    const id = `enr_${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newEnr: CourseEnrollment = {
      id,
      courseId,
      studentId,
      enrolledAt: nowStr,
      status: 'active',
      progressPct: 0,
      lastAccessedAt: nowStr,
    };

    try {
      supabase.from('course_enrollments').upsert({
        id,
        course_id: courseId,
        student_id: studentId,
        enrolled_at: nowStr,
        status: 'active',
        progress_pct: 0,
        last_accessed_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    setState((current) => bump({
      ...current,
      courseEnrollments: [...(current.courseEnrollments || []).filter((e) => !(e.studentId === studentId && e.courseId === courseId)), newEnr]
    }));
    return result(true, 'Enrolled in course successfully.');
  }, [bump, result]);

  const markLessonComplete = useCallback((studentId: string, courseId: string, lessonId: string) => {
    const id = `prog_${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newProg: LessonProgress = {
      id,
      studentId,
      courseId,
      lessonId,
      status: 'completed',
      completedAt: nowStr,
    };

    try {
      supabase.from('lesson_progress').upsert({
        id,
        student_id: studentId,
        course_id: courseId,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: nowStr,
      }).then(() => {}, () => {});
    } catch {}

    setState((current) => {
      const filtered = (current.lessonProgress || []).filter((p) => !(p.studentId === studentId && p.lessonId === lessonId));
      const nextProgressList = [...filtered, newProg];

      // Auto-recalculate student's enrollment progress %
      const cLessons = (current.courseLessons || []).filter((l) => l.courseId === courseId);
      const studentCompletedCount = cLessons.filter((l) => nextProgressList.some((p) => p.studentId === studentId && p.lessonId === l.id)).length;
      const progressPct = cLessons.length > 0 ? Math.round((studentCompletedCount / cLessons.length) * 100) : 100;

      const updatedEnrollments = (current.courseEnrollments || []).map((e) => {
        if (e.studentId === studentId && e.courseId === courseId) {
          const updated = { ...e, progressPct, status: (progressPct === 100 ? ('completed' as const) : ('active' as const)), lastAccessedAt: nowStr };
          try {
            supabase.from('course_enrollments').update({ progress_pct: progressPct, status: updated.status, last_accessed_at: nowStr }).eq('id', e.id).then(() => {}, () => {});
          } catch {}
          return updated;
        }
        return e;
      });

      return bump({ ...current, lessonProgress: nextProgressList, courseEnrollments: updatedEnrollments });
    });

    return result(true, 'Lesson completed.');
  }, [bump, result]);

  // Class Recordings Callbacks
  const createClassRecording = useCallback(async (
    recording: Omit<ClassRecording, 'id' | 'createdAt' | 'viewsCount' | 'attendees'> & { id?: string; attendees?: number }
  ): Promise<ActionResult> => {
    const recId = recording.id || `rec_${Date.now()}`;
    const nowStr = new Date().toISOString();
    const batchObj = state.batches.find((b) => b.id === recording.batchId || b.name === recording.batchName || b.name === recording.batch);
    const courseObj = state.courses.find((c) => c.id === recording.courseId || c.title === recording.courseTitle);
    const teacherObj = state.teachers.find((t) => t.id === recording.teacherId || t.name === recording.teacherName);
    
    const batchStudentsCount = state.students.filter((s: any) => s.batchId === (batchObj?.id || recording.batchId) || s.batch === (batchObj?.name || recording.batch)).length;
    const attendeesCount = recording.attendees ?? (batchStudentsCount > 0 ? batchStudentsCount : 25);

    const newRec: ClassRecording = {
      id: recId,
      title: recording.title,
      courseId: recording.courseId || courseObj?.id || 'course_ds',
      courseTitle: recording.courseTitle || courseObj?.title || 'Data Structures',
      subject: recording.subject || courseObj?.category || 'Computer Science',
      batchId: recording.batchId || batchObj?.id || 'batch_001',
      batchName: recording.batchName || batchObj?.name || recording.batch || 'CS-2024-A',
      batch: recording.batchName || batchObj?.name || recording.batch || 'CS-2024-A',
      teacherId: recording.teacherId || teacherObj?.id || 'teacher_001',
      teacherName: recording.teacherName || teacherObj?.name || 'Sneha Kapoor',
      classSessionId: recording.classSessionId,
      date: recording.date || new Date().toISOString().split('T')[0],
      duration: recording.duration || '01:30:00',
      attendees: attendeesCount,
      videoUrl: recording.videoUrl,
      thumbnail: recording.thumbnail || 'https://images.pexels.com/photos/6147276/pexels-photo-6147276.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: recording.status || 'ready',
      viewsCount: 0,
      createdAt: nowStr,
    };

    try {
      await supabase.from('class_recordings').insert({
        id: newRec.id,
        title: newRec.title,
        course_id: newRec.courseId,
        course_title: newRec.courseTitle,
        subject: newRec.subject,
        batch_id: newRec.batchId,
        batch_name: newRec.batchName,
        teacher_id: newRec.teacherId,
        teacher_name: newRec.teacherName,
        class_session_id: newRec.classSessionId,
        date: newRec.date,
        duration: newRec.duration,
        video_url: newRec.videoUrl,
        thumbnail_url: newRec.thumbnail,
        status: newRec.status,
        views_count: 0,
        created_at: nowStr,
      });
    } catch (e) {
      console.warn('[SkillToss DB] Failed inserting class_recording to Supabase, continuing locally', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_recordings_channel');
      bc.postMessage({ type: 'NEW_CLASS_RECORDING', payload: newRec });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      classRecordings: [newRec, ...(current.classRecordings || seedRecordings)],
    }));

    return result(true, 'Class recording published successfully!');
  }, [bump, result, state.batches, state.courses, state.teachers, state.students]);

  const recordRecordingView = useCallback(async (recordingId: string, studentId: string): Promise<ActionResult> => {
    if (!recordingId || !studentId) return result(false, 'Invalid view parameters');

    const sessionKey = `viewed_rec_${recordingId}_${studentId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return result(true, 'View already logged for this session');
    }
    sessionStorage.setItem(sessionKey, 'true');

    const viewId = `view_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowStr = new Date().toISOString();

    let newCount = 1;
    const existingRec = (state.classRecordings || seedRecordings).find((r) => r.id === recordingId);
    if (existingRec) {
      newCount = (existingRec.viewsCount || 0) + 1;
    }

    try {
      await supabase.from('recording_views').insert({
        id: viewId,
        recording_id: recordingId,
        student_id: studentId,
        session_id: sessionKey,
        viewed_at: nowStr,
      });
      await supabase.from('class_recordings').update({ views_count: newCount }).eq('id', recordingId);
    } catch (e) {
      console.warn('[SkillToss DB] Failed logging view to Supabase, fallback to local', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_recordings_channel');
      bc.postMessage({ type: 'UPDATE_RECORDING_VIEW', payload: { recordingId, viewsCount: newCount } });
      bc.close();
    } catch {}

    setState((current) => {
      const currentList = current.classRecordings || seedRecordings;
      const updatedList = currentList.map((r) => r.id === recordingId ? { ...r, viewsCount: (r.viewsCount || 0) + 1 } : r);
      const newViewObj: RecordingView = { id: viewId, recordingId, studentId, sessionId: sessionKey, viewedAt: nowStr };
      return bump({
        ...current,
        classRecordings: updatedList,
        recordingViews: [newViewObj, ...(current.recordingViews || [])],
      });
    });

    return result(true, 'View recorded');
  }, [bump, result, state.classRecordings]);

  const getAttendeesForRecording = useCallback((recordingId: string) => {
    const allRecs = state.classRecordings || seedRecordings;
    const rec = allRecs.find((r) => r.id === recordingId);
    if (!rec) return [];

    const targetBatchId = rec.batchId;
    const targetBatchName = rec.batchName || rec.batch;

    const batchStudents = state.students.filter((s: any) => 
      s.batchId === targetBatchId || s.batch === targetBatchName
    );

    const activeSessionId = rec.classSessionId;

    return batchStudents.map((student) => {
      const attRecord = state.attendance.find((a) => a.studentId === student.id && (a.date === rec.date || a.batchId === targetBatchId));
      const onlineRecord = state.onlineAttendance.find((o) => o.studentId === student.id && (activeSessionId ? o.classSessionId === activeSessionId : true));

      let status: 'present' | 'absent' | 'online' = 'present';
      let onlineMinutes: number | undefined = undefined;

      if (onlineRecord) {
        status = 'online';
        onlineMinutes = onlineRecord.durationMinutes || 45;
      } else if (attRecord) {
        status = attRecord.status === 'present' ? 'present' : 'absent';
      } else {
        status = student.id === 'student_002' ? 'absent' : 'present';
      }

      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        department: student.departmentId || 'CS',
        status,
        onlineMinutes,
      };
    });
  }, [state.classRecordings, state.students, state.attendance, state.onlineAttendance]);

  const getViewsForRecording = useCallback((recordingId: string) => {
    const allViews = state.recordingViews || [];
    const recViews = allViews.filter((v) => v.recordingId === recordingId);

    const rec = (state.classRecordings || seedRecordings).find((r) => r.id === recordingId);
    
    if (recViews.length === 0 && rec && (rec.viewsCount || 0) > 0) {
      const batchStudents = state.students.filter((s: any) => 
        s.batchId === rec.batchId || s.batch === (rec.batchName || rec.batch)
      );
      return batchStudents.slice(0, Math.min(rec.viewsCount || 5, batchStudents.length)).map((s, idx) => ({
        id: `v_demo_${idx}`,
        studentId: s.id,
        studentName: s.name,
        rollNo: s.rollNo,
        department: s.departmentId || 'CS',
        viewedAt: new Date(Date.now() - (idx + 1) * 3600000 * 4).toISOString(),
      }));
    }

    return recViews.map((v) => {
      const student = state.students.find((s) => s.id === v.studentId);
      return {
        id: v.id,
        studentId: v.studentId,
        studentName: student?.name || 'Student User',
        rollNo: student?.rollNo || 'STU-2026',
        department: student?.departmentId || 'CS',
        viewedAt: v.viewedAt,
      };
    });
  }, [state.recordingViews, state.classRecordings, state.students]);

  const deleteClassRecording = useCallback(async (recordingId: string): Promise<ActionResult> => {
    try {
      await supabase.from('class_recordings').delete().eq('id', recordingId);
    } catch (e) {
      console.warn('[SkillToss DB] Failed deleting class_recording on Supabase', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_recordings_channel');
      bc.postMessage({ type: 'DELETE_CLASS_RECORDING', payload: { id: recordingId } });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      classRecordings: (current.classRecordings || seedRecordings).filter((r) => r.id !== recordingId),
    }));

    return result(true, 'Recording deleted');
  }, [bump, result]);

  const downloadRecordingFile = useCallback(async (recording: ClassRecording): Promise<ActionResult> => {
    if (!recording.videoUrl) {
      return result(false, 'Video file URL is missing or unavailable.');
    }

    try {
      const a = document.createElement('a');
      a.href = recording.videoUrl;
      a.download = `${recording.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return result(true, 'Download started successfully!');
    } catch (err) {
      return result(false, 'Download failed or file URL is blocked.');
    }
  }, [result]);

  const getAcademicEvents = useCallback((userRole?: string, userId?: string, batchId?: string): AcademicEvent[] => {
    const combined: AcademicEvent[] = [];

    // 1. Classes from state.classSessions
    (state.classSessions || []).forEach((cs: any) => {
      const course = state.courses.find((c) => c.id === cs.courseId);
      const batch = state.batches.find((b) => b.id === cs.batchId);
      const teacher = state.teachers.find((t) => t.id === cs.instructorId || t.id === cs.teacherId);

      combined.push({
        id: `cs_${cs.id}`,
        title: cs.title || (course ? `${course.title} Class` : 'Live Class'),
        type: 'class',
        courseId: cs.courseId,
        courseTitle: course?.title || 'General Course',
        subject: cs.subject || course?.category || 'Computer Science',
        batchId: cs.batchId,
        batchName: batch?.name || cs.batchName || 'CS-2024-A',
        teacherId: cs.instructorId || cs.teacherId || 'teacher_001',
        teacherName: cs.instructorName || teacher?.name || 'Sneha Kapoor',
        date: cs.date,
        startTime: cs.startTime || '09:00',
        endTime: cs.endTime || '10:30',
        roomOrLink: cs.meetingLink || cs.jitsiRoomName || 'Room 204',
        meetingLink: cs.meetingLink,
        description: cs.agenda || `${course?.title || 'Class'} live session`,
        status: cs.status as any,
        referenceId: cs.id,
      });
    });

    // 2. Exams from state.exams
    (state.exams || []).forEach((ex: any) => {
      const course = state.courses.find((c) => c.id === ex.courseId);
      const batch = state.batches.find((b) => b.id === ex.batchId);

      let endTimeStr = '11:00';
      if (ex.startTime) {
        const parts = ex.startTime.split(':');
        const h = parseInt(parts[0], 10) || 10;
        const m = parseInt(parts[1], 10) || 0;
        const totalM = h * 60 + m + (ex.durationMinutes || 60);
        const endH = Math.floor(totalM / 60) % 24;
        const endM = totalM % 60;
        endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      combined.push({
        id: `exam_${ex.id}`,
        title: ex.title,
        type: 'exam',
        courseId: ex.courseId,
        courseTitle: course?.title || 'General Course',
        subject: ex.subject || course?.category || 'Computer Science',
        batchId: ex.batchId,
        batchName: batch?.name || 'CS-2024-A',
        date: ex.date,
        startTime: ex.startTime || '10:00',
        endTime: endTimeStr,
        description: ex.syllabus || 'Examination / Assessment',
        status: ex.status as any,
        maxMarks: ex.maxMarks,
        referenceId: ex.id,
      });
    });

    // 3. Assignments from state.assignments
    (state.assignments || []).forEach((as) => {
      const course = state.courses.find((c) => c.id === as.courseId);
      const batch = state.batches.find((b) => b.id === as.batchId);
      const dueDateStr = as.dueDate ? as.dueDate.split('T')[0] : '2026-09-05';
      const dueTimeStr = as.dueDate && as.dueDate.includes('T') ? as.dueDate.split('T')[1].substring(0, 5) : '23:59';

      combined.push({
        id: `as_${as.id}`,
        title: `${as.title} (Due)`,
        type: 'assignment',
        courseId: as.courseId,
        courseTitle: course?.title || 'General Course',
        batchId: as.batchId,
        batchName: batch?.name || 'CS-2024-A',
        teacherId: as.teacherId,
        date: dueDateStr,
        startTime: dueTimeStr,
        endTime: dueTimeStr,
        description: as.instructions || 'Assignment submission deadline',
        status: as.status as any,
        referenceId: as.id,
      });
    });

    // 4. Custom Academic Events from state.academicEvents
    (state.academicEvents || []).forEach((ae) => {
      combined.push(ae);
    });

    // Filter by role & batch permissions
    if (userRole === 'student' || userRole === 'parent') {
      const targetBatchId = batchId || 'batch_001';
      return combined.filter((e) => {
        if (e.type === 'holiday') return true;
        if (!e.batchId || e.batchId === 'all') return true;
        return e.batchId === targetBatchId || e.batchName === targetBatchId;
      });
    }

    if (userRole === 'teacher') {
      const teacherObj = state.teachers.find((t) => t.id === userId || t.email.toLowerCase() === userId?.toLowerCase());
      const teacherBatchIds = teacherObj?.batchIds || ['batch_001', 'b1'];
      return combined.filter((e) => {
        if (e.type === 'holiday') return true;
        if (!e.batchId || e.batchId === 'all') return true;
        if (e.teacherId === userId || e.teacherId === teacherObj?.id) return true;
        return teacherBatchIds.includes(e.batchId || '');
      });
    }

    // Admin sees all
    return combined;
  }, [state.classSessions, state.exams, state.assignments, state.academicEvents, state.courses, state.batches, state.teachers]);

  const checkScheduleConflict = useCallback((
    batchId: string,
    teacherId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string
  ): { hasConflict: boolean; conflictingEvent?: AcademicEvent } => {
    const allEvents = getAcademicEvents();
    
    const toMinutes = (timeStr?: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime) || newStart + 60;

    for (const e of allEvents) {
      if (excludeEventId && (e.id === excludeEventId || e.referenceId === excludeEventId)) continue;
      if (e.date !== date) continue;
      if (e.status === 'cancelled') continue;

      const sameBatch = batchId && e.batchId && (e.batchId === batchId || e.batchId === 'all');
      const sameTeacher = teacherId && e.teacherId && e.teacherId === teacherId;

      if (sameBatch || sameTeacher) {
        const eStart = toMinutes(e.startTime);
        const eEnd = toMinutes(e.endTime) || eStart + 60;

        if (newStart < eEnd && newEnd > eStart) {
          return { hasConflict: true, conflictingEvent: e };
        }
      }
    }

    return { hasConflict: false };
  }, [getAcademicEvents]);

  const createAcademicEvent = useCallback(async (
    eventData: Omit<AcademicEvent, 'id' | 'createdAt'> & { id?: string }
  ): Promise<ActionResult> => {
    const newId = eventData.id || `evt_${Date.now()}`;
    const nowStr = new Date().toISOString();

    const newEvent: AcademicEvent = {
      id: newId,
      title: eventData.title,
      type: eventData.type,
      courseId: eventData.courseId,
      courseTitle: eventData.courseTitle,
      subject: eventData.subject,
      batchId: eventData.batchId,
      batchName: eventData.batchName,
      teacherId: eventData.teacherId,
      teacherName: eventData.teacherName,
      date: eventData.date,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      roomOrLink: eventData.roomOrLink,
      description: eventData.description,
      reminderMinutes: eventData.reminderMinutes || 15,
      createdBy: eventData.createdBy,
      status: eventData.status || 'scheduled',
      createdAt: nowStr,
    };

    try {
      await supabase.from('academic_events').insert({
        id: newEvent.id,
        title: newEvent.title,
        event_type: newEvent.type,
        course_id: newEvent.courseId,
        course_title: newEvent.courseTitle,
        subject: newEvent.subject,
        batch_id: newEvent.batchId,
        batch_name: newEvent.batchName,
        teacher_id: newEvent.teacherId,
        teacher_name: newEvent.teacherName,
        date: newEvent.date,
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        room_or_link: newEvent.roomOrLink,
        description: newEvent.description,
        reminder_minutes: newEvent.reminderMinutes,
        created_by: newEvent.createdBy,
        status: newEvent.status,
        created_at: nowStr,
      });
    } catch (e) {
      console.warn('[SkillToss DB] Failed inserting academic_event to Supabase, continuing local fallback', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_calendar_channel');
      bc.postMessage({ type: 'NEW_ACADEMIC_EVENT', payload: newEvent });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      academicEvents: [newEvent, ...(current.academicEvents || [])],
    }));

    return result(true, `Academic event "${newEvent.title}" published successfully!`);
  }, [bump, result]);

  const deleteAcademicEvent = useCallback(async (eventId: string): Promise<ActionResult> => {
    try {
      await supabase.from('academic_events').delete().eq('id', eventId);
    } catch (e) {
      console.warn('[SkillToss DB] Failed deleting academic_event on Supabase', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_calendar_channel');
      bc.postMessage({ type: 'DELETE_ACADEMIC_EVENT', payload: { id: eventId } });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      academicEvents: (current.academicEvents || []).filter((e) => e.id !== eventId),
    }));

    return result(true, 'Event deleted successfully');
  }, [bump, result]);

  const updateAcademicEventStatus = useCallback(async (eventId: string, status: 'scheduled' | 'live' | 'completed' | 'cancelled'): Promise<ActionResult> => {
    try {
      await supabase.from('academic_events').update({ status }).eq('id', eventId);
    } catch (e) {
      console.warn('[SkillToss DB] Failed updating academic_event status on Supabase', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_calendar_channel');
      bc.postMessage({ type: 'UPDATE_ACADEMIC_EVENT', payload: { id: eventId, status } });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      academicEvents: (current.academicEvents || []).map((e) => (e.id === eventId ? { ...e, status } : e)),
    }));

    return result(true, `Event status updated to ${status}`);
  }, [bump, result]);

  // ====================================================
  // REAL-TIME EXAM & ASSESSMENT SYSTEM HANDLERS
  // ====================================================
  const saveOrUpdateExam = useCallback(async (input: Partial<LmsExam>): Promise<ActionResult> => {
    if (!input.title?.trim() || !input.date || (input.maxMarks && input.maxMarks <= 0)) {
      return result(false, 'Please complete all required fields with valid parameters.');
    }

    const examId = input.id || `exam_${Date.now()}`;
    const nowStr = new Date().toISOString();

    const courseObj = state.courses.find((c) => c.id === input.courseId);
    const batchObj = state.batches.find((b) => b.id === input.batchId);
    const teacherObj = state.teachers.find((t) => t.id === input.teacherId);

    const fullExam: LmsExam = {
      id: examId,
      courseId: input.courseId || courseObj?.id || 'course_ds',
      courseTitle: input.courseTitle || courseObj?.title || 'Data Structures',
      batchId: input.batchId || batchObj?.id || 'batch_001',
      batchName: input.batchName || batchObj?.name || 'CS-2024-A',
      subject: input.subject || courseObj?.category || 'Computer Science',
      teacherId: input.teacherId || teacherObj?.id || 'teacher_001',
      teacherName: input.teacherName || teacherObj?.name || 'Sneha Kapoor',
      title: input.title.trim(),
      examType: input.examType || 'internal',
      date: input.date,
      startTime: input.startTime || '10:00',
      durationMinutes: Number(input.durationMinutes || 60),
      maxMarks: Number(input.maxMarks || 50),
      passingMarks: Number(input.passingMarks || 20),
      syllabus: input.syllabus || '',
      instructions: input.instructions || '',
      questions: input.questions || [],
      attachmentName: input.attachmentName || undefined,
      attachments: input.attachments || [],
      status: input.status || 'scheduled',
      createdAt: input.createdAt || nowStr,
    };

    try {
      await supabase.from('exams').upsert({
        id: fullExam.id,
        title: fullExam.title,
        exam_type: fullExam.examType,
        course_id: fullExam.courseId,
        course_title: fullExam.courseTitle,
        batch_id: fullExam.batchId,
        batch_name: fullExam.batchName,
        subject: fullExam.subject,
        teacher_id: fullExam.teacherId,
        teacher_name: fullExam.teacherName,
        date: fullExam.date,
        start_time: fullExam.startTime,
        duration_minutes: fullExam.durationMinutes,
        max_marks: fullExam.maxMarks,
        passing_marks: fullExam.passingMarks,
        syllabus: fullExam.syllabus,
        instructions: fullExam.instructions,
        questions: fullExam.questions,
        attachment_name: fullExam.attachmentName,
        status: fullExam.status,
        created_at: fullExam.createdAt,
      });
    } catch (e) {
      console.warn('[SkillToss DB] Failed upserting exam on Supabase', e);
    }

    try {
      if (fullExam.status !== 'draft') {
        const parts = fullExam.startTime.split(':');
        const h = parseInt(parts[0], 10) || 10;
        const m = parseInt(parts[1], 10) || 0;
        const endTimeMins = h * 60 + m + fullExam.durationMinutes;
        const endH = Math.floor(endTimeMins / 60) % 24;
        const endM = endTimeMins % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        await createAcademicEvent({
          id: `evt_exam_${fullExam.id}`,
          title: fullExam.title,
          type: 'exam',
          courseId: fullExam.courseId,
          courseTitle: fullExam.courseTitle,
          subject: fullExam.subject,
          batchId: fullExam.batchId,
          batchName: fullExam.batchName,
          teacherId: fullExam.teacherId,
          teacherName: fullExam.teacherName,
          date: fullExam.date,
          startTime: fullExam.startTime,
          endTime: endTimeStr,
          description: fullExam.syllabus || fullExam.instructions,
          status: 'scheduled',
          referenceId: fullExam.id,
        });
      }
    } catch (e) {}

    try {
      const bc = new BroadcastChannel('skilltoss_exams_channel');
      bc.postMessage({ type: 'NEW_EXAM', payload: fullExam });
      bc.close();
    } catch {}

    const batchStudents = state.students.filter((s) => s.batchId === fullExam.batchId || (s as any).batch === fullExam.batchName);
    const newNotifs = batchStudents.map((s, idx) => ({
      id: `${fullExam.id}_notif_${s.id}_${idx}`,
      userId: s.id,
      type: 'academic' as const,
      title: `Assessment ${fullExam.status === 'scheduled' ? 'Scheduled' : 'Updated'}`,
      message: `${fullExam.title} is scheduled for ${fullExam.date} at ${fullExam.startTime}.`,
      timestamp: nowStr,
      read: false,
      relatedEntityId: fullExam.id,
      path: '/student/exams',
    }));

    setState((current) => {
      const idx = current.exams.findIndex((e) => e.id === fullExam.id);
      let updatedExams = [...current.exams];
      if (idx >= 0) {
        updatedExams[idx] = fullExam;
      } else {
        updatedExams = [fullExam, ...updatedExams];
      }
      return bump({
        ...current,
        exams: updatedExams,
        notifications: [...newNotifs, ...current.notifications],
      });
    });

    return result(true, `Assessment "${fullExam.title}" saved successfully!`);
  }, [bump, createAcademicEvent, result, state.batches, state.courses, state.teachers, state.students]);

  const submitExamPaper = useCallback(async (input: {
    examId: string;
    studentId: string;
    studentName?: string;
    rollNo?: string;
    batchId?: string;
    answers: Record<string, string>;
    autoMarks?: number;
  }): Promise<ActionResult> => {
    const exam = state.exams.find((e) => e.id === input.examId);
    if (!exam) return result(false, 'Target exam not found');

    const studentObj = state.students.find((s) => s.id === input.studentId);
    const nowStr = new Date().toISOString();
    const submissionId = `sub_exam_${exam.id}_${input.studentId}`;

    const calculatedMarks = input.autoMarks ?? 0;
    const pct = Math.round((calculatedMarks / (exam.maxMarks || 50)) * 100);

    const submission: LmsExamResult = {
      id: submissionId,
      examId: exam.id,
      studentId: input.studentId,
      studentName: input.studentName || studentObj?.name || 'Student',
      rollNo: input.rollNo || studentObj?.rollNo || 'BFC-001',
      batchId: input.batchId || studentObj?.batchId || exam.batchId,
      answers: input.answers,
      marks: calculatedMarks,
      maxMarks: exam.maxMarks,
      percentage: pct,
      status: 'submitted',
      submittedAt: nowStr,
    };

    try {
      await supabase.from('exam_submissions').upsert({
        id: submission.id,
        exam_id: submission.examId,
        student_id: submission.studentId,
        student_name: submission.studentName,
        roll_no: submission.rollNo,
        batch_id: submission.batchId,
        answers: submission.answers,
        marks: submission.marks,
        max_marks: submission.maxMarks,
        percentage: submission.percentage,
        status: submission.status,
        submitted_at: submission.submittedAt,
      });
    } catch (e) {
      console.warn('[SkillToss DB] Failed upserting exam submission to Supabase', e);
    }

    try {
      const bc = new BroadcastChannel('skilltoss_exams_channel');
      bc.postMessage({ type: 'NEW_EXAM_SUBMISSION', payload: submission });
      bc.close();
    } catch {}

    setState((current) => {
      const idx = (current.examResults || []).findIndex((r) => r.id === submission.id || (r.examId === exam.id && r.studentId === input.studentId));
      let updatedRes = [...(current.examResults || [])];
      if (idx >= 0) {
        updatedRes[idx] = submission;
      } else {
        updatedRes = [submission, ...updatedRes];
      }
      return bump({
        ...current,
        examResults: updatedRes,
      });
    });

    return result(true, 'Exam submission received successfully!');
  }, [bump, result, state.exams, state.students]);

  const evaluateExamSubmission = useCallback(async (
    submissionId: string,
    marks: number,
    feedback?: string
  ): Promise<ActionResult> => {
    const nowStr = new Date().toISOString();
    let updatedSub: LmsExamResult | null = null;

    setState((current) => {
      const sub = (current.examResults || []).find((r) => r.id === submissionId);
      if (!sub) return current;

      const maxM = sub.maxMarks || 50;
      const pct = Math.round((marks / maxM) * 100);

      updatedSub = {
        ...sub,
        marks,
        percentage: pct,
        feedback: feedback || '',
        status: 'evaluated',
        evaluatedAt: nowStr,
      };

      try {
        supabase.from('exam_submissions').update({
          marks: updatedSub.marks,
          percentage: updatedSub.percentage,
          feedback: updatedSub.feedback,
          status: 'evaluated',
          evaluated_at: nowStr,
        }).eq('id', submissionId).then();
      } catch {}

      try {
        const bc = new BroadcastChannel('skilltoss_exams_channel');
        bc.postMessage({ type: 'UPDATE_EXAM_SUBMISSION', payload: updatedSub });
        bc.close();
      } catch {}

      const nextResults = (current.examResults || []).map((r) => (r.id === submissionId ? updatedSub! : r));
      return bump({ ...current, examResults: nextResults });
    });

    return result(true, 'Submission evaluated & grade saved.');
  }, [bump, result]);

  const publishExamResults = useCallback(async (examId: string): Promise<ActionResult> => {
    const nowStr = new Date().toISOString();

    try {
      await supabase.from('exams').update({ status: 'results_published' }).eq('id', examId);
    } catch {}

    const exam = state.exams.find((e) => e.id === examId);
    const batchStudents = state.students.filter((s) => s.batchId === exam?.batchId || (s as any).batch === exam?.batchName);
    const newNotifs = batchStudents.map((s, idx) => ({
      id: `${examId}_pub_notif_${s.id}_${idx}`,
      userId: s.id,
      type: 'academic' as const,
      title: 'Assessment Results Published 📢',
      message: `Results for ${exam?.title || 'Assessment'} are now published!`,
      timestamp: nowStr,
      read: false,
      relatedEntityId: examId,
      path: '/student/exams',
    }));

    setState((current) => bump({
      ...current,
      exams: current.exams.map((e) => (e.id === examId ? { ...e, status: 'results_published' } : e)),
      notifications: [...newNotifs, ...current.notifications],
    }));

    return result(true, 'Exam results published to all batch students!');
  }, [bump, result, state.exams, state.students]);

  const getExamAnalytics = useCallback((examId: string) => {
    const exam = state.exams.find((e) => e.id === examId);
    const batchStudents = state.students.filter((s) => s.batchId === exam?.batchId || (s as any).batch === exam?.batchName);
    const totalStudents = batchStudents.length > 0 ? batchStudents.length : 42;

    const subs = (state.examResults || []).filter((r) => r.examId === examId);
    const submittedCount = subs.length;
    const evaluatedCount = subs.filter((r) => r.status === 'evaluated').length;
    const pendingCount = Math.max(0, submittedCount - evaluatedCount);

    const evaluatedSubs = subs.filter((r) => r.status === 'evaluated' || r.marks !== undefined);
    const scores = evaluatedSubs.map((r) => r.percentage || Math.round((r.marks / (exam?.maxMarks || 50)) * 100));

    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 78;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 96;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 44;
    const passingScoreMins = exam?.passingMarks || 20;
    const passCount = evaluatedSubs.filter((r) => r.marks >= passingScoreMins).length;
    const passPercentage = evaluatedSubs.length > 0 ? Math.round((passCount / evaluatedSubs.length) * 100) : 85;

    return {
      totalStudents,
      submittedCount,
      evaluatedCount,
      pendingCount,
      averageScore,
      highestScore,
      lowestScore,
      passPercentage,
    };
  }, [state.exams, state.students, state.examResults]);

  const deleteExam = useCallback(async (examId: string): Promise<ActionResult> => {
    try {
      await supabase.from('exams').delete().eq('id', examId);
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_exams_channel');
      bc.postMessage({ type: 'DELETE_EXAM', payload: { id: examId } });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      exams: current.exams.filter((e) => e.id !== examId),
      examResults: (current.examResults || []).filter((r) => r.examId !== examId),
    }));

    return result(true, 'Exam removed successfully');
  }, [bump, result]);

  const updateTeacherProfile = useCallback(async (teacherId: string, updates: Partial<LmsTeacher>): Promise<ActionResult> => {
    const existing = state.teachers.find((t) => t.id === teacherId || t.email.toLowerCase() === updates.email?.toLowerCase());
    const fullTeacher: LmsTeacher = {
      id: teacherId,
      name: updates.name || existing?.name || 'Faculty Member',
      email: updates.email || existing?.email || '',
      phone: updates.phone ?? existing?.phone ?? '',
      courseIds: updates.courseIds || existing?.courseIds || [],
      batchIds: updates.batchIds || existing?.batchIds || [],
      avatar: updates.avatar ?? existing?.avatar ?? '',
      status: updates.status || existing?.status || 'active',
      salary: updates.salary ?? existing?.salary,
      employeeId: updates.employeeId ?? existing?.employeeId ?? 'EMP-CS-104',
      designation: updates.designation ?? existing?.designation ?? 'Assistant Professor',
      department: updates.department ?? existing?.department ?? 'Computer Science',
      institution: updates.institution ?? existing?.institution ?? 'Bright Future College',
      dob: updates.dob ?? existing?.dob ?? '',
      gender: updates.gender ?? existing?.gender ?? '',
      address: updates.address ?? existing?.address ?? '',
      emergencyContact: updates.emergencyContact ?? existing?.emergencyContact ?? '',
      joiningDate: updates.joiningDate ?? existing?.joiningDate ?? '',
      yearsOfExperience: updates.yearsOfExperience ?? existing?.yearsOfExperience ?? '',
      subjects: updates.subjects ?? existing?.subjects ?? [],
      expertise: updates.expertise ?? existing?.expertise ?? [],
      education: updates.education ?? existing?.education ?? [],
      experience: updates.experience ?? existing?.experience ?? [],
      officialEmail: updates.officialEmail ?? existing?.officialEmail ?? updates.email ?? existing?.email ?? '',
      officeLocation: updates.officeLocation ?? existing?.officeLocation ?? '',
      officeHours: updates.officeHours ?? existing?.officeHours ?? '',
      availableDays: updates.availableDays ?? existing?.availableDays ?? [],
      visibility: updates.visibility ?? existing?.visibility ?? 'all',
    };

    // Dynamic profile completion scoring
    let score = 0;
    if (fullTeacher.name) score += 10;
    if (fullTeacher.avatar) score += 10;
    if (fullTeacher.designation) score += 10;
    if (fullTeacher.department) score += 10;
    if (fullTeacher.phone) score += 10;
    if (fullTeacher.officeHours && fullTeacher.officeLocation) score += 10;
    if (fullTeacher.subjects?.length) score += 10;
    if (fullTeacher.expertise?.length) score += 10;
    if (fullTeacher.education?.length) score += 10;
    if (fullTeacher.experience?.length) score += 10;
    fullTeacher.profileCompletion = score;

    try {
      await supabase.from('teachers').upsert({
        id: fullTeacher.id,
        name: fullTeacher.name,
        email: fullTeacher.email,
        phone: fullTeacher.phone,
        course_ids: fullTeacher.courseIds,
        batch_ids: fullTeacher.batchIds,
        avatar: fullTeacher.avatar,
        status: fullTeacher.status,
        employee_id: fullTeacher.employeeId,
        designation: fullTeacher.designation,
        department: fullTeacher.department,
        institution: fullTeacher.institution,
        dob: fullTeacher.dob,
        gender: fullTeacher.gender,
        address: fullTeacher.address,
        emergency_contact: fullTeacher.emergencyContact,
        joining_date: fullTeacher.joiningDate,
        years_of_experience: fullTeacher.yearsOfExperience,
        subjects: fullTeacher.subjects,
        expertise: fullTeacher.expertise,
        education: fullTeacher.education,
        experience: fullTeacher.experience,
        official_email: fullTeacher.officialEmail,
        office_location: fullTeacher.officeLocation,
        office_hours: fullTeacher.officeHours,
        available_days: fullTeacher.availableDays,
        visibility: fullTeacher.visibility,
        profile_completion: fullTeacher.profileCompletion,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not update teacher in Supabase database:', err);
    }

    try {
      await supabase.from('profiles').update({
        full_name: fullTeacher.name,
        avatar_url: fullTeacher.avatar,
      }).eq('id', fullTeacher.id);
    } catch {}

    try {
      const bc = new BroadcastChannel('skilltoss_teacher_profile_channel');
      bc.postMessage({ type: 'UPDATE_TEACHER_PROFILE', payload: fullTeacher });
      bc.close();
    } catch {}

    setState((current) => bump({
      ...current,
      teachers: (current.teachers || []).some((t) => t.id === fullTeacher.id)
        ? current.teachers.map((t) => (t.id === fullTeacher.id ? fullTeacher : t))
        : [fullTeacher, ...(current.teachers || [])],
    }));

    return result(true, 'Profile updated successfully');
  }, [bump, result, state.teachers]);

  const value = useMemo<LmsDataContextValue>(() => ({
    state, feedback, setFeedback, clearFeedback: () => setFeedback(null), resetDemoData: () => { setState(cloneSeed()); setFeedback({ kind: 'success', message: 'Demo data reset.' }); },
    getStudentSummary, getStudentAssignments, getStudentFees, getStudentExams, getStudentResources, getOnlineAttendanceForSession, searchRecords, syncClassSession,
    addStudent, createAssignment, saveSubmission, gradeSubmission, markAttendance, recordPayment, addResource, incrementResourceDownload, deleteResource, downloadResourceFile, scheduleExam, scheduleClass, updateClassStatus, updateClassSessionStatus, recordOnlineJoin, recordOnlineLeave, updateStudentProfile, updateLeaveStatus, requestLeave, createForumPost, likeForumPost, commentForumPost, sendCommunityMessage, toggleMessageReaction, pinCommunityMessage, deleteCommunityMessage, editCommunityMessage, markCommunityChannelAsRead, saveGoal, deleteGoal, addEvent,
    onlineStudentIds, sendBatchAnnouncement,
    markNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
    markAllNotificationsRead: (userId) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item) })),
    addBetaProgram, updateBetaProgram, addRoadmapFeature, updateRoadmapFeature, addGlobalCampaign, updateGlobalCampaign, resolveExecutiveDecision, createRoleFromRequest, rejectRoleRequest, createWorkflow, updateWorkflow, updateIntegration, updateBranchTheme,
    createCommunityPost, editCommunityPost, deleteCommunityPost, addCommunityAnswer, toggleCommunityUpvote, toggleCommunityBookmark, toggleCommunityFollow, markBestAnswer, reportCommunityContent, adminModerateReport, togglePinCommunityPost,
    // Course Management Actions
    saveCourseDraft, submitCourseForReview, adminReviewCourse, addCourseModule, updateCourseModule, deleteCourseModule, addCourseLesson, updateCourseLesson, deleteCourseLesson, enrollStudentInCourse, markLessonComplete,
    // Class Recording Actions
    createClassRecording, recordRecordingView, getAttendeesForRecording, getViewsForRecording, deleteClassRecording, downloadRecordingFile,
    // Real-Time Academic Calendar Actions
    createAcademicEvent, deleteAcademicEvent, updateAcademicEventStatus, getAcademicEvents, checkScheduleConflict,
    // Real-Time Exam Management Actions
    saveOrUpdateExam, submitExamPaper, evaluateExamSubmission, publishExamResults, getExamAnalytics, deleteExam,
    // Real-Time Teacher Profile Actions
    updateTeacherProfile,
  }), [addEvent, addResource, incrementResourceDownload, deleteResource, downloadResourceFile, addStudent, createAssignment, createForumPost, likeForumPost, commentForumPost, sendCommunityMessage, toggleMessageReaction, pinCommunityMessage, deleteCommunityMessage, editCommunityMessage, markCommunityChannelAsRead, deleteGoal, feedback, getOnlineAttendanceForSession, getStudentAssignments, getStudentExams, getStudentFees, getStudentResources, getStudentSummary, gradeSubmission, markAttendance, recordOnlineJoin, recordOnlineLeave, recordPayment, requestLeave, saveGoal, saveSubmission, scheduleClass, scheduleExam, searchRecords, setFeedback, state, syncClassSession, updateClassStatus, updateClassSessionStatus, updateLeaveStatus, updateStudentProfile, onlineStudentIds, sendBatchAnnouncement, createCommunityPost, editCommunityPost, deleteCommunityPost, addCommunityAnswer, toggleCommunityUpvote, toggleCommunityBookmark, toggleCommunityFollow, markBestAnswer, reportCommunityContent, adminModerateReport, togglePinCommunityPost, saveCourseDraft, submitCourseForReview, adminReviewCourse, addCourseModule, updateCourseModule, deleteCourseModule, addCourseLesson, updateCourseLesson, deleteCourseLesson, enrollStudentInCourse, markLessonComplete, addBetaProgram, updateBetaProgram, addRoadmapFeature, updateRoadmapFeature, addGlobalCampaign, updateGlobalCampaign, resolveExecutiveDecision, createRoleFromRequest, rejectRoleRequest, createWorkflow, updateWorkflow, updateIntegration, updateBranchTheme, createClassRecording, recordRecordingView, getAttendeesForRecording, getViewsForRecording, deleteClassRecording, downloadRecordingFile, createAcademicEvent, deleteAcademicEvent, updateAcademicEventStatus, getAcademicEvents, checkScheduleConflict, saveOrUpdateExam, submitExamPaper, evaluateExamSubmission, publishExamResults, getExamAnalytics, deleteExam, updateTeacherProfile]);

  return <LmsDataContext.Provider value={value}>{children}</LmsDataContext.Provider>;
}



