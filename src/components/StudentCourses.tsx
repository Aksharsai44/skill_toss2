import { useState } from 'react';
import {
  PlayCircle, Clock, ChevronRight, ArrowLeft, BookOpen, FileText,
  ClipboardList, FileQuestion, CheckCircle2, GraduationCap,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useStudentPortal } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';

/*
 * Courses read from the shared institution records, not from Supabase.
 *
 * The previous version queried `courses` and `course_lessons`, neither of which exists in the
 * Phase 1 schema. Both queries failed, the error was discarded by `if (!error && data)`, and the
 * page then rendered "Your teachers haven't published any courses yet" — a false statement about a
 * request that never reached a table. It also modelled a video marketplace (thumbnails, price,
 * enrolled_count, per-lesson video_url) for which no data source exists anywhere in this product.
 *
 * What the institution actually records per course is a code, a title, an owning department, a
 * teacher, the batches taking it, plus the assignments, exams, attendance and resources attached to
 * it. That is what this page shows, all of it derived from records the rest of the portal displays.
 */

export function StudentCourses() {
  const { selectedStudent } = useStudentPortal();
  const { state, getStudentPortalInsights } = useLmsData();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const student = selectedStudent ? state.students.find((item) => item.id === selectedStudent.id) : undefined;
  const batch = state.batches.find((item) => item.id === student?.batchId);
  const insights = selectedStudent ? getStudentPortalInsights(selectedStudent.id) : null;
  const courses = student ? state.courses.filter((course) => course.batchIds.includes(student.batchId)) : [];

  if (!student) {
    return (
      <div>
        <PageHeader title="My Courses" subtitle="Courses your batch is enrolled in." />
        <Card><EmptyState icon={GraduationCap} title="No student record linked" description="This account has no enrolled student record in this institution yet, so no course enrolment can be resolved. Ask your institution admin to enrol it, then reload." /></Card>
      </div>
    );
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  if (selectedCourse) {
    return <CourseDetail courseId={selectedCourse.id} onBack={() => setSelectedCourseId(null)} />;
  }

  return (
    <div>
      <PageHeader title="My Courses" subtitle={`Courses ${batch?.name ?? 'your batch'} is enrolled in, with progress counted from your own submissions and results.`} />
      {courses.length === 0 ? (
        <Card><EmptyState icon={PlayCircle} title="No courses assigned to your batch" description={`No course in ${state.institution.name} currently lists ${batch?.name ?? 'your batch'}. Once an admin assigns one, it appears here.`} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const teacher = state.teachers.find((item) => item.id === course.teacherId);
            const department = state.departments.find((item) => item.id === course.departmentId);
            const progress = insights?.courseProgress.find((item) => item.courseId === course.id);
            const attendance = insights?.attendanceSubjects.find((item) => item.courseId === course.id);
            return (
              <Card key={course.id} className="p-5 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary">{course.code}</Badge>
                  {department && <Badge variant="neutral">{department.name}</Badge>}
                </div>
                <h3 className="font-semibold text-ink-900 mt-2.5">{course.title}</h3>
                <p className="text-xs text-ink-600 mt-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{teacher?.name ?? 'Teacher not assigned'}</span></p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-ink-500">Assessments done</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900 tabular-nums">{progress ? `${progress.completed} / ${progress.total}` : 'None set'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Attendance</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900 tabular-nums">{attendance ? `${attendance.percentage}%` : 'Not marked'}</dd>
                  </div>
                </dl>
                <div className="mt-3 h-2 bg-ink-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress?.percentage ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.title} assessment progress`}>
                  <div className="h-full bg-primary-600 rounded-full transition-[width] duration-300" style={{ width: `${progress?.percentage ?? 0}%` }} />
                </div>
                <div className="mt-auto pt-4">
                  <button type="button" onClick={() => setSelectedCourseId(course.id)} className="btn-secondary w-full text-sm">
                    Open course <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseDetail({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const navigate = useNavigate();
  const { selectedStudent } = useStudentPortal();
  const { state, getStudentAssignments, getStudentResources, getStudentPortalInsights } = useLmsData();

  const course = state.courses.find((item) => item.id === courseId);
  const student = selectedStudent ? state.students.find((item) => item.id === selectedStudent.id) : undefined;
  const insights = selectedStudent ? getStudentPortalInsights(selectedStudent.id) : null;
  const teacher = state.teachers.find((item) => item.id === course?.teacherId);
  const department = state.departments.find((item) => item.id === course?.departmentId);
  const progress = insights?.courseProgress.find((item) => item.courseId === courseId);
  const attendance = insights?.attendanceSubjects.find((item) => item.courseId === courseId);

  const assignments = selectedStudent ? getStudentAssignments(selectedStudent.id).filter((item) => item.courseId === courseId) : [];
  const resources = selectedStudent ? getStudentResources(selectedStudent.id).filter((item) => item.courseId === courseId) : [];
  const exams = state.exams.filter((exam) => exam.courseId === courseId && exam.batchId === student?.batchId).sort((a, b) => a.date.localeCompare(b.date));

  if (!course) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded-md text-sm text-ink-600 hover:text-primary-700 transition-colors focus-ring mb-4"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to courses</button>
        <Card><EmptyState icon={PlayCircle} title="Course no longer available" description="This course is no longer in the institution's records." /></Card>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded-md text-sm text-ink-600 hover:text-primary-700 transition-colors focus-ring mb-4"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to courses</button>
      <PageHeader title={course.title} subtitle={`${course.code}${department ? ` · ${department.name}` : ''}${teacher ? ` · ${teacher.name}` : ''}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-ink-200 divide-x divide-y lg:divide-y-0 divide-ink-200 bg-white mb-6">
        <div className="p-4">
          <p className="text-xs text-ink-500">Assessments completed</p>
          <p className="text-xl font-bold text-ink-900 mt-1 tabular-nums">{progress ? `${progress.completed} / ${progress.total}` : '—'}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-ink-500">Attendance</p>
          <p className="text-xl font-bold text-ink-900 mt-1 tabular-nums">{attendance ? `${attendance.percentage}%` : '—'}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-ink-500">Assignments</p>
          <p className="text-xl font-bold text-ink-900 mt-1 tabular-nums">{assignments.length}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-ink-500">Resources</p>
          <p className="text-xl font-bold text-ink-900 mt-1 tabular-nums">{resources.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Assignments" subtitle="Your submission status for this course" />
          {assignments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No assignments set" description="Your teacher has not set an assignment for this course yet." />
          ) : (
            <div className="divide-y divide-ink-100">
              {assignments.map((assignment) => (
                <button key={assignment.id} type="button" onClick={() => navigate('/student/assignments')} className="w-full p-4 flex items-start gap-3 text-left hover:bg-ink-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40">
                  <ClipboardList className="w-4 h-4 mt-1 text-primary-700 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900 truncate">{assignment.title}</span>
                    <span className="block text-xs text-ink-600 mt-1">Due {new Date(assignment.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {assignment.maxMarks} marks</span>
                  </span>
                  <StatusBadge status={assignment.submission?.status ?? 'not-started'} />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Exams" subtitle="Scheduled and completed assessments for this course" />
          {exams.length === 0 ? (
            <EmptyState icon={FileQuestion} title="No exams scheduled" description="No exam has been scheduled for this course and your batch." />
          ) : (
            <div className="divide-y divide-ink-100">
              {exams.map((exam) => {
                const result = state.examResults.find((item) => item.examId === exam.id && item.studentId === selectedStudent?.id);
                return (
                  <div key={exam.id} className="p-4 flex items-start gap-3">
                    <FileQuestion className="w-4 h-4 mt-1 text-accent-600 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 truncate">{exam.title}</p>
                      <p className="text-xs text-ink-600 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="tabular-nums">{new Date(exam.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {exam.startTime} · {exam.durationMinutes} min</span>
                      </p>
                    </div>
                    {result
                      ? <span className="text-sm font-semibold text-success-700 tabular-nums shrink-0">{result.marks}/{exam.maxMarks}</span>
                      : <StatusBadge status={exam.status} />}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Course materials"
            subtitle="Uploaded by your teacher"
            action={resources.length > 0 ? <button type="button" onClick={() => navigate('/student/resources')} className="btn-secondary text-xs">Open Resources</button> : undefined}
          />
          {resources.length === 0 ? (
            <EmptyState icon={FileText} title="No materials uploaded" description="Notes, slides and reading links your teacher uploads for this course appear here." />
          ) : (
            <div className="divide-y divide-ink-100">
              {resources.map((resource) => (
                <div key={resource.id} className="p-4 flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', resource.type === 'LINK' ? 'bg-accent-50 text-accent-700' : 'bg-primary-50 text-primary-700')} aria-hidden="true">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{resource.title}</p>
                    <p className="text-xs text-ink-600 mt-1">{resource.type} · uploaded {new Date(resource.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                    <p className="text-sm leading-6 text-ink-600 mt-1.5">{resource.description}</p>
                  </div>
                  {resource.attachments?.length
                    ? <span className="text-xs text-ink-600 shrink-0 tabular-nums">{resource.attachments.length} file{resource.attachments.length === 1 ? '' : 's'}</span>
                    : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {progress && progress.total > 0 && progress.completed === progress.total && (
        <div className="mt-6 rounded-card border border-success-200 bg-success-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-success-900">Every assessment for this course is complete</h2>
            <p className="text-sm leading-6 text-success-800 mt-1">All {progress.total} assignment and exam records for this course are submitted or graded. Certificate issuance is handled separately by the institution and is not configured in this build.</p>
          </div>
        </div>
      )}
    </div>
  );
}
