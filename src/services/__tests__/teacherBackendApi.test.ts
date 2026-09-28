import { teacherBackendApi } from '../teacherBackendApi';
import { teacherService } from '../teacherService';
import type { LmsAttendanceRecord, LmsCourse, LmsSubmission, LmsAssignment, LmsBatch, LmsStudent, LmsClassSession } from '@/lib/types';

export function runBackendApiSmokeTests(): { passed: boolean; message: string } {
  // Test 1: Check API method existence
  if (
    typeof teacherBackendApi.fetchMyBatches !== 'function' ||
    typeof teacherBackendApi.fetchBatchStudents !== 'function' ||
    typeof teacherBackendApi.markBatchAttendance !== 'function' ||
    typeof teacherBackendApi.createAssignment !== 'function' ||
    typeof teacherBackendApi.gradeSubmission !== 'function' ||
    typeof teacherBackendApi.fetchBatchAttendance !== 'function' ||
    typeof teacherBackendApi.fetchBatchAssignments !== 'function' ||
    typeof teacherBackendApi.fetchAssignmentSubmissions !== 'function' ||
    typeof teacherBackendApi.fetchBatchResources !== 'function' ||
    typeof teacherBackendApi.createCommunityAnnouncement !== 'function' ||
    typeof teacherBackendApi.verifyTeacherBatchAccess !== 'function'
  ) {
    return { passed: false, message: 'Missing required API methods in teacherBackendApi' };
  }

  // Test 2: KPI Metrics Computation
  const mockBatches: LmsBatch[] = [{ id: 'b1', name: 'Batch A', departmentId: 'd1', teacherId: 't1', schedule: 'MWF' }];
  const mockStudents: LmsStudent[] = [{ id: 's1', name: 'Student 1', rollNo: '001', batchId: 'b1', departmentId: 'd1', email: 's1@edu.com', phone: '', parentPhone: '', address: '', emergencyContact: '', avatar: '', status: 'active' }];
  const mockAttendance: LmsAttendanceRecord[] = [{ id: 'a1', studentId: 's1', courseId: 'c1', batchId: 'b1', date: '2026-08-12', status: 'present' }];
  const mockAssignments: LmsAssignment[] = [{ id: 'asgn1', title: 'HW 1', courseId: 'c1', batchId: 'b1', teacherId: 't1', instructions: '', dueDate: '2026-08-20', maxMarks: 100, status: 'open', createdAt: '' }];
  const mockSubmissions: LmsSubmission[] = [{ id: 'sub1', assignmentId: 'asgn1', studentId: 's1', response: 'done', submittedAt: '', status: 'submitted' }];

  const kpis = teacherService.computeKpis(mockBatches, mockStudents, mockAttendance, mockAssignments, mockSubmissions);
  if (kpis.totalBatches !== 1 || kpis.totalStudents !== 1 || kpis.averageAttendancePct !== 100 || kpis.pendingWorkCount !== 0) {
    return { passed: false, message: 'KPI computation failed expected values' };
  }

  // Test 3: Today's Classes Mapping
  const mockSessions: LmsClassSession[] = [{ id: 'sess1', courseId: 'c1', batchId: 'b1', teacherId: 't1', date: '2026-08-12', startTime: '10:00', endTime: '11:00', mode: 'jitsi', status: 'scheduled' }];
  const mockCourses: LmsCourse[] = [{
    id: 'c1', code: 'CS101', title: 'Data Structures', description: 'DS Course', category: 'CS', departmentId: 'd1',
    level: 'Intermediate', durationHours: 40, instructorId: 't1', instructorName: 'Prof. Smith', instructorRole: 'teacher',
    thumbnail: '', learningObjectives: [], prerequisites: [], skillsGained: [], version: '1.0', status: 'PUBLISHED', enrolledCount: 30
  }];

  const classes = teacherService.getTodayClasses(mockSessions, mockCourses, mockBatches, mockStudents, '2026-08-12');
  if (classes.length !== 1 || classes[0].courseTitle !== 'Data Structures' || classes[0].durationMinutes !== 60) {
    return { passed: false, message: 'Today classes mapping failed expected values' };
  }

  return { passed: true, message: 'All Teacher Dashboard backend API smoke tests passed successfully!' };
}
