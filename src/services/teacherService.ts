import type {
  LmsBatch,
  LmsStudent,
  LmsAttendanceRecord,
  LmsAssignment,
  LmsSubmission,
  LmsClassSession,
  LmsCourse,
  LmsResource,
} from '@/lib/types';

// API-Ready Service Layer for Teacher Dashboard
// This layer decouples UI components from direct state/storage implementations,
// allowing seamless future transition to Supabase REST / GraphQL API endpoints.

export interface KpiMetrics {
  totalBatches: number;
  totalStudents: number;
  averageAttendancePct: number;
  pendingWorkCount: number;
}

export interface TodayClassItem {
  id: string;
  courseTitle: string;
  batchName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  studentCount: number;
  mode: 'jitsi' | 'classroom' | 'online';
  location?: string;
}

export interface BatchSummaryItem {
  id: string;
  name: string;
  courseTitle: string;
  studentCount: number;
  averageAttendancePct: number;
  currentProgressPct: number;
  nextClassText: string;
  status: 'active' | 'completed' | 'upcoming';
}

export interface StudentRosterItem {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  avatar: string;
  attendancePct: number;
  pendingWorkCount: number;
  status: 'active' | 'inactive' | 'online' | 'offline' | 'in_class' | 'away';
  lastActivityText: string;
}

export interface StudentDetailData {
  student: LmsStudent;
  attendancePct: number;
  submittedCount: number;
  totalAssignments: number;
  pendingCount: number;
  courseProgressPct: number;
  recentSubmissions: {
    assignmentId: string;
    title: string;
    dueDate: string;
    status: 'submitted' | 'graded' | 'pending';
    marks?: number;
    maxMarks?: number;
  }[];
  recentActivities: {
    id: string;
    title: string;
    type: 'assignment' | 'attendance' | 'exam' | 'login';
    timestamp: string;
  }[];
}

// Service helper functions wrapping application context and future API calls
export const teacherService = {
  // Compute Teacher KPI Metrics from current state
  computeKpis(
    batches: LmsBatch[],
    students: LmsStudent[],
    attendance: LmsAttendanceRecord[],
    assignments: LmsAssignment[],
    submissions: LmsSubmission[]
  ): KpiMetrics {
    const totalBatches = batches.length;
    const totalStudents = students.length;

    // Avg Attendance
    let averageAttendancePct = 90;
    if (students.length > 0 && attendance.length > 0) {
      const studentIds = new Set(students.map((s) => s.id));
      const relevant = attendance.filter((a) => studentIds.has(a.studentId));
      if (relevant.length > 0) {
        const present = relevant.filter((a) => a.status === 'present').length;
        averageAttendancePct = Math.round((present / relevant.length) * 100);
      }
    }

    // Pending Work (unsubmitted tasks across enrolled students)
    let pendingWorkCount = 0;
    if (assignments.length > 0) {
      students.forEach((student) => {
        const bAssignments = assignments.filter((a) => a.batchId === student.batchId);
        const sSubs = submissions.filter(
          (sub) => sub.studentId === student.id && (sub.status === 'submitted' || sub.status === 'graded')
        );
        pendingWorkCount += Math.max(0, bAssignments.length - sSubs.length);
      });
    }

    return {
      totalBatches,
      totalStudents,
      averageAttendancePct,
      pendingWorkCount,
    };
  },

  // Map today's class sessions into TodayClassItem format
  getTodayClasses(
    sessions: LmsClassSession[],
    courses: LmsCourse[],
    batches: LmsBatch[],
    students: LmsStudent[],
    todayStr: string
  ): TodayClassItem[] {
    const todaySessions = sessions.filter((s) => s.date === todayStr);

    return todaySessions.map((session) => {
      const course = courses.find((c) => c.id === session.courseId);
      const batch = batches.find((b) => b.id === session.batchId);
      const bStudents = students.filter((s) => s.batchId === session.batchId);

      // Duration calculation
      let durationMinutes = 60;
      if (session.startTime && session.endTime) {
        const [sh, sm] = session.startTime.split(':').map(Number);
        const [eh, em] = session.endTime.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          durationMinutes = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
        }
      }

      return {
        id: session.id,
        courseTitle: course?.title || 'Class Session',
        batchName: batch?.name || 'Batch',
        startTime: session.startTime,
        endTime: session.endTime,
        durationMinutes,
        status: (session.status as TodayClassItem['status']) || 'scheduled',
        studentCount: bStudents.length || 30,
        mode: (session.mode as TodayClassItem['mode']) || 'jitsi',
        location: session.location,
      };
    });
  },

  // Map batches into BatchSummaryItem format
  getBatchSummaries(
    batches: LmsBatch[],
    courses: LmsCourse[],
    students: LmsStudent[],
    attendance: LmsAttendanceRecord[],
    sessions: LmsClassSession[]
  ): BatchSummaryItem[] {
    return batches.map((batch) => {
      const bStudents = students.filter((s) => s.batchId === batch.id);
      const course = courses.find((c) => c.batchIds?.includes(batch.id) || c.departmentId === batch.departmentId);

      // Attendance % for batch
      let averageAttendancePct = 88;
      if (bStudents.length > 0) {
        const studentIds = new Set(bStudents.map((s) => s.id));
        const records = attendance.filter((a) => studentIds.has(a.studentId));
        if (records.length > 0) {
          const present = records.filter((a) => a.status === 'present').length;
          averageAttendancePct = Math.round((present / records.length) * 100);
        }
      }

      // Next class text
      const nextSession = sessions.find(
        (s) => s.batchId === batch.id && (s.status === 'scheduled' || s.status === 'live')
      );
      const nextClassText = nextSession
        ? `${nextSession.date === '2026-08-12' ? 'Today' : nextSession.date}, ${nextSession.startTime}`
        : 'Schedule Pending';

      return {
        id: batch.id,
        name: batch.name,
        courseTitle: course?.title || 'Data Science & Software Engineering',
        studentCount: bStudents.length,
        averageAttendancePct,
        currentProgressPct: 75,
        nextClassText,
        status: 'active',
      };
    });
  },

  // ----------------------------------------------------
  // ASYNCHRONOUS BACKEND DATA INTEGRATION (PostgreSQL / Supabase)
  // ----------------------------------------------------
  async fetchBatchesAsync(teacherId: string, tenantId?: string | null): Promise<LmsBatch[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchMyBatches(teacherId, tenantId);
    return res.data || [];
  },

  async fetchBatchStudentsAsync(batchId: string, tenantId?: string | null): Promise<LmsStudent[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchBatchStudents(batchId, tenantId);
    return res.data || [];
  },

  async saveAttendanceAsync(
    batchId: string,
    date: string,
    records: { studentId: string; status: 'present' | 'absent'; courseId?: string }[],
    teacherId: string
  ): Promise<{ success: boolean; message: string }> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.markBatchAttendance(batchId, date, records, teacherId);
    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: `Attendance saved for ${res.data?.recordsUpdated || records.length} students` };
  },

  async createAssignmentAsync(
    assignment: Omit<LmsAssignment, 'id' | 'createdAt'>,
    teacherId: string
  ): Promise<{ success: boolean; data?: LmsAssignment; error?: string }> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.createAssignment(assignment, teacherId);
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'Failed to create assignment' };
    }
    return { success: true, data: res.data };
  },

  async gradeSubmissionAsync(
    submissionId: string,
    marks: number,
    feedback: string,
    teacherId: string
  ): Promise<{ success: boolean; message: string }> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.gradeSubmission(submissionId, marks, feedback, teacherId);
    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: 'Submission graded successfully' };
  },

  async fetchBatchAttendanceAsync(batchId: string, tenantId?: string | null): Promise<LmsAttendanceRecord[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchBatchAttendance(batchId, tenantId);
    return res.data || [];
  },

  async fetchBatchAssignmentsAsync(batchId: string, tenantId?: string | null): Promise<LmsAssignment[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchBatchAssignments(batchId, tenantId);
    return res.data || [];
  },

  async fetchAssignmentSubmissionsAsync(assignmentId: string, tenantId?: string | null): Promise<LmsSubmission[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchAssignmentSubmissions(assignmentId, tenantId);
    return res.data || [];
  },

  async fetchBatchResourcesAsync(batchId: string, tenantId?: string | null): Promise<LmsResource[]> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.fetchBatchResources(batchId, tenantId);
    return res.data || [];
  },

  async createAnnouncementAsync(
    title: string,
    content: string,
    batchId: string,
    teacherId: string
  ): Promise<{ success: boolean; message: string }> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    const res = await teacherBackendApi.createCommunityAnnouncement(title, content, batchId, teacherId);
    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: 'Announcement posted successfully' };
  },

  async verifyTeacherBatchAccessAsync(teacherId: string, batchId: string): Promise<boolean> {
    const { teacherBackendApi } = await import('@/services/teacherBackendApi');
    return await teacherBackendApi.verifyTeacherBatchAccess(teacherId, batchId);
  },
};


