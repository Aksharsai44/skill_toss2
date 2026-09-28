import { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, Plus, Edit, Trash2, Save, Upload, Video, Clock,
  Layers, ArrowLeft, Award, Eye, Check, Sparkles, Send, FileText,
  AlertTriangle, CheckCircle2, XCircle, Globe, HelpCircle, Code2,
  ChevronRight, FileCheck, ExternalLink, BarChart2, BookOpen
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import type { LmsCourse, CourseModule, CourseLesson, CourseStatus, LessonType } from '@/lib/types';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { FileAttachmentPicker } from '@/components/FileAttachmentPicker';
import { AiCourseAssistantModal } from '@/components/courses/AiCourseAssistantModal';
import { CourseReviewModal } from '@/components/courses/CourseReviewModal';
import { CourseAnalyticsView } from '@/components/courses/CourseAnalyticsView';

const STOCK_THUMBS = [
  'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1181376/pexels-photo-1181376.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=600',
];

interface CourseBuilderProps {
  instructorName: string;
  instructorRole: 'admin' | 'teacher';
}

export function CourseBuilder({ instructorName, instructorRole }: CourseBuilderProps) {
  const { state, saveCourseDraft, submitCourseForReview, adminReviewCourse, setFeedback } = useLmsData();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const [activeCourse, setActiveCourse] = useState<LmsCourse | null>(null);
  const [showBuilderModal, setShowBuilderModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showAnalyticsView, setShowAnalyticsView] = useState<boolean>(false);

  // Multi-step builder state
  const [step, setStep] = useState<number>(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form Fields
  const [courseForm, setCourseForm] = useState<{
    id?: string;
    code: string;
    title: string;
    description: string;
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    durationHours: number;
    thumbnail: string;
    objectivesText: string;
    prerequisitesText: string;
    skillsText: string;
  }>({
    code: 'CS-101',
    title: '',
    description: '',
    category: 'Computer Science',
    level: 'Beginner',
    durationHours: 12,
    thumbnail: STOCK_THUMBS[0],
    objectivesText: 'Master fundamental data structures\nImplement efficient algorithms',
    prerequisitesText: 'Basic programming knowledge in C++ or Python',
    skillsText: 'Data Structures, Problem Solving, Algorithmic Thinking',
  });

  // Modules & Lessons state in builder
  const [builderModules, setBuilderModules] = useState<CourseModule[]>([
    { id: 'mod_1', courseId: '', title: 'Module 1: Foundations', sortOrder: 1 }
  ]);
  const [builderLessons, setBuilderLessons] = useState<CourseLesson[]>([
    { id: 'les_1', courseId: '', moduleId: 'mod_1', title: 'Lesson 1.1: Overview & Introduction', lessonType: 'VIDEO', durationMinutes: 15, sortOrder: 1, videoUrl: 'https://www.youtube.com/watch?v=RBSGKlAvoiM' }
  ]);

  // Selected lesson being edited in builder
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<Partial<CourseLesson>>({
    title: '',
    lessonType: 'VIDEO',
    durationMinutes: 10,
    videoUrl: '',
    resourceUrl: '',
    richText: '',
  });

  const allCourses = state.courses || [];
  const teacherCourses = instructorRole === 'teacher'
    ? allCourses.filter((c) => c.instructorName === instructorName || c.instructorRole === 'teacher')
    : allCourses;

  const filteredCourses = teacherCourses.filter((c) => {
    const statusMatch = selectedStatusFilter === 'All' || c.status === selectedStatusFilter;
    const levelMatch = selectedLevelFilter === 'All' || c.level === selectedLevelFilter;
    return statusMatch && levelMatch;
  });

  const publishedCount = teacherCourses.filter((c) => c.status === 'PUBLISHED').length;
  const pendingCount = teacherCourses.filter((c) => c.status === 'PENDING_REVIEW').length;
  const draftCount = teacherCourses.filter((c) => c.status === 'DRAFT' || c.status === 'CHANGES_REQUESTED').length;
  const totalEnrolled = teacherCourses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);

  const handleOpenNewCourse = () => {
    setCourseForm({
      code: `CS-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      description: '',
      category: 'Computer Science',
      level: 'Beginner',
      durationHours: 12,
      thumbnail: STOCK_THUMBS[Math.floor(Math.random() * STOCK_THUMBS.length)],
      objectivesText: 'Master core principles\nBuild practical projects',
      prerequisitesText: 'Basic programming skills',
      skillsText: 'Software Engineering, Algorithmic Analysis',
    });
    setBuilderModules([{ id: `mod_${Date.now()}`, courseId: '', title: 'Module 1: Introduction', sortOrder: 1 }]);
    setBuilderLessons([]);
    setStep(1);
    setValidationErrors([]);
    setShowBuilderModal(true);
  };

  const handleOpenEditCourse = (course: LmsCourse) => {
    setActiveCourse(course);
    setCourseForm({
      id: course.id,
      code: course.code || 'CS-101',
      title: course.title,
      description: course.description || '',
      category: course.category || 'General',
      level: course.level || 'Beginner',
      durationHours: course.durationHours || 10,
      thumbnail: course.thumbnail || STOCK_THUMBS[0],
      objectivesText: (course.learningObjectives || []).join('\n'),
      prerequisitesText: (course.prerequisites || []).join(', '),
      skillsText: (course.skillsGained || []).join(', '),
    });

    const cMods = (state.courseModules || []).filter((m) => m.courseId === course.id);
    const cLess = (state.courseLessons || []).filter((l) => l.courseId === course.id);
    setBuilderModules(cMods.length > 0 ? cMods : [{ id: `mod_${Date.now()}`, courseId: course.id, title: 'Module 1: Core', sortOrder: 1 }]);
    setBuilderLessons(cLess);
    setStep(1);
    setValidationErrors([]);
    setShowBuilderModal(true);
  };

  const handleAddModule = () => {
    const newMod: CourseModule = {
      id: `mod_${Date.now()}`,
      courseId: courseForm.id || '',
      title: `Module ${builderModules.length + 1}: New Topic`,
      sortOrder: builderModules.length + 1,
    };
    setBuilderModules([...builderModules, newMod]);
  };

  const handleAddLessonToModule = (moduleId: string) => {
    const modLessons = builderLessons.filter((l) => l.moduleId === moduleId);
    const newLes: CourseLesson = {
      id: `les_${Date.now()}`,
      courseId: courseForm.id || '',
      moduleId,
      title: `Lesson ${modLessons.length + 1}`,
      lessonType: 'VIDEO',
      durationMinutes: 10,
      sortOrder: modLessons.length + 1,
    };
    setBuilderLessons([...builderLessons, newLes]);
    setEditingLessonId(newLes.id);
    setLessonForm(newLes);
  };

  const handleSaveDraftAction = () => {
    const objectives = courseForm.objectivesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const prerequisites = courseForm.prerequisitesText.split(',').map((s) => s.trim()).filter(Boolean);
    const skillsGained = courseForm.skillsText.split(',').map((s) => s.trim()).filter(Boolean);

    const draftCourse: Partial<LmsCourse> = {
      id: courseForm.id,
      code: courseForm.code,
      title: courseForm.title || 'Untitled Draft Course',
      description: courseForm.description,
      category: courseForm.category,
      level: courseForm.level,
      durationHours: Number(courseForm.durationHours) || 10,
      thumbnail: courseForm.thumbnail,
      learningObjectives: objectives,
      prerequisites,
      skillsGained,
      instructorName,
      instructorRole,
      status: 'DRAFT',
    };

    saveCourseDraft(draftCourse, builderModules, builderLessons);
    setShowBuilderModal(false);
  };

  const validateCourseForm = (): boolean => {
    const errors: string[] = [];
    if (!courseForm.title.trim()) errors.push('Please enter a course title.');
    if (!courseForm.description.trim()) errors.push('Please enter a course description.');
    if (builderModules.length === 0) errors.push('Please add at least one module.');
    if (builderLessons.length === 0) errors.push('Please add at least one lesson.');
    if (!courseForm.objectivesText.trim()) errors.push('Please add at least one learning objective.');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmitForReviewAction = () => {
    if (!validateCourseForm()) return;

    const objectives = courseForm.objectivesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const prerequisites = courseForm.prerequisitesText.split(',').map((s) => s.trim()).filter(Boolean);
    const skillsGained = courseForm.skillsText.split(',').map((s) => s.trim()).filter(Boolean);

    const finalCourse: Partial<LmsCourse> = {
      id: courseForm.id,
      code: courseForm.code,
      title: courseForm.title,
      description: courseForm.description,
      category: courseForm.category,
      level: courseForm.level,
      durationHours: Number(courseForm.durationHours) || 10,
      thumbnail: courseForm.thumbnail,
      learningObjectives: objectives,
      prerequisites,
      skillsGained,
      instructorName,
      instructorRole,
      status: 'PENDING_REVIEW',
    };

    const res = saveCourseDraft(finalCourse, builderModules, builderLessons);
    if (res.ok) {
      const cId = courseForm.id || (state.courses.find((c) => c.title === courseForm.title)?.id);
      if (cId) submitCourseForReview(cId);
    }
    setShowBuilderModal(false);
  };

  if (showAnalyticsView && activeCourse) {
    const cMods = (state.courseModules || []).filter((m) => m.courseId === activeCourse.id);
    const cLess = (state.courseLessons || []).filter((l) => l.courseId === activeCourse.id);
    return (
      <div className="space-y-4">
        <button onClick={() => setShowAnalyticsView(false)} className="btn-secondary text-xs flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to My Courses
        </button>
        <CourseAnalyticsView
          course={activeCourse}
          modules={cMods}
          lessons={cLess}
          enrollments={state.courseEnrollments || []}
          progressList={state.lessonProgress || []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={instructorRole === 'admin' ? 'Course Review & Management' : 'My Courses'}
        subtitle={instructorRole === 'admin' ? 'Review teacher-created courses, approve changes, and publish to students' : 'Create structured courses with video, PDF, and AI assistance — admin reviews before publishing'}
        actions={
          <button onClick={handleOpenNewCourse} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> + New Course
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={teacherCourses.length} icon={PlayCircle} color="primary" />
        <StatCard label="Published" value={publishedCount} icon={CheckCircle2} color="success" />
        <StatCard label="Pending Review" value={pendingCount} icon={Clock} color="warning" />
        <StatCard label="Total Enrolled Students" value={totalEnrolled} icon={Layers} color="accent" />
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ink-50 p-2 rounded-2xl border border-ink-200/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-500 px-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Status:
          </span>
          {['All', 'DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition',
                selectedStatusFilter === st
                  ? 'bg-white text-primary-700 font-semibold shadow-xs border border-ink-200'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              {st}
              {st !== 'All' && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({teacherCourses.filter((c) => c.status === st).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">Level:</span>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevelFilter(lvl)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs transition',
                selectedLevelFilter === lvl ? 'bg-ink-200 text-ink-900 font-semibold' : 'text-ink-500 hover:text-ink-800'
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-8 text-center">
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description="Create your first course and organize your modules, lessons, assessments, and AI resources in one place."
          />
          <button onClick={handleOpenNewCourse} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Course
          </button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => {
            const cMods = (state.courseModules || []).filter((m) => m.courseId === c.id);
            const cLess = (state.courseLessons || []).filter((l) => l.courseId === c.id);

            return (
              <Card key={c.id} className="overflow-hidden flex flex-col group hover:shadow-md transition">
                <div className="relative h-44 overflow-hidden bg-ink-100">
                  <img
                    src={c.thumbnail || STOCK_THUMBS[0]}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={
                        c.status === 'PUBLISHED' ? 'success' :
                        c.status === 'APPROVED' ? 'accent' :
                        c.status === 'PENDING_REVIEW' ? 'warning' :
                        c.status === 'CHANGES_REQUESTED' ? 'warning' : 'neutral'
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg font-medium">
                    {c.level} • {c.durationHours} hrs
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">{c.category}</div>
                    <h3 className="font-bold text-ink-900 text-base line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-ink-500 mt-1 line-clamp-2">{c.description || 'No course description provided.'}</p>
                  </div>

                  {c.status === 'CHANGES_REQUESTED' && c.adminFeedback && (
                    <div className="p-3 bg-warning-50 border border-warning-200 rounded-xl text-xs text-warning-900">
                      <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-warning-600" /> Admin Feedback:</p>
                      <p className="mt-0.5 text-warning-800 line-clamp-2">{c.adminFeedback}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                    <span>{cMods.length} Modules • {cLess.length} Lessons</span>
                    <span>{c.enrolledCount || 0} Enrolled</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEditCourse(c)}
                      className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit / Content
                    </button>

                    {instructorRole === 'admin' ? (
                      <button
                        onClick={() => { setActiveCourse(c); setShowReviewModal(true); }}
                        className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Course
                      </button>
                    ) : (
                      <button
                        onClick={() => { setActiveCourse(c); setShowAnalyticsView(true); }}
                        className="btn-secondary text-xs p-2 flex items-center justify-center"
                        title="View Course Analytics"
                      >
                        <BarChart2 className="w-4 h-4 text-primary-600" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Multi-Step Course Builder Modal */}
      <Modal
        open={showBuilderModal}
        onClose={() => setShowBuilderModal(false)}
        title={courseForm.id ? `Edit Course — ${courseForm.title}` : 'Create New Course Workflow'}
        size="xl"
      >
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between bg-ink-50 p-3 rounded-2xl border border-ink-200/70">
            {[
              { s: 1, l: 'Course Information' },
              { s: 2, l: 'Curriculum & Lessons' },
              { s: 3, l: 'File Resources & AI' },
              { s: 4, l: 'Preview & Submit' },
            ].map((stItem) => (
              <button
                key={stItem.s}
                onClick={() => setStep(stItem.s)}
                className={cn(
                  'flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition',
                  step === stItem.s ? 'bg-primary-600 text-white shadow-xs' : 'text-ink-600 hover:text-ink-900'
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{stItem.s}</span>
                <span className="hidden sm:inline">{stItem.l}</span>
              </button>
            ))}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-error-50 border border-error-200 rounded-2xl text-xs text-error-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-error-600" /> Required Fields Missing:</p>
              {validationErrors.map((err, idx) => (
                <p key={idx} className="pl-5">• {err}</p>
              ))}
            </div>
          )}

          {/* STEP 1: Course Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Course Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="e.g. Master Data Structures & Algorithms"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Course Code *</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="e.g. CS-201"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Detailed summary of what this course offers..."
                  className="input w-full min-h-[90px] text-xs"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Category</label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Level</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                    className="input w-full"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="label">Duration (Hours)</label>
                  <input
                    type="number"
                    value={courseForm.durationHours}
                    onChange={(e) => setCourseForm({ ...courseForm, durationHours: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={courseForm.thumbnail}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.value })}
                  className="input w-full text-xs"
                />
                <div className="flex gap-2 mt-2">
                  {STOCK_THUMBS.map((thumb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCourseForm({ ...courseForm, thumbnail: thumb })}
                      className={cn('w-12 h-10 rounded-lg overflow-hidden border-2 transition', courseForm.thumbnail === thumb ? 'border-primary-600 scale-105' : 'border-transparent opacity-70')}
                    >
                      <img src={thumb} alt="Stock" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Learning Objectives (One per line)</label>
                  <textarea
                    value={courseForm.objectivesText}
                    onChange={(e) => setCourseForm({ ...courseForm, objectivesText: e.target.value })}
                    className="input w-full min-h-[80px] text-xs"
                  />
                </div>
                <div>
                  <label className="label">Prerequisites (Comma separated)</label>
                  <textarea
                    value={courseForm.prerequisitesText}
                    onChange={(e) => setCourseForm({ ...courseForm, prerequisitesText: e.target.value })}
                    className="input w-full min-h-[80px] text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Curriculum Builder */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink-900 text-sm">Curriculum Architecture (Modules & Lessons)</h3>
                <button onClick={handleAddModule} className="btn-secondary text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> + Add Module
                </button>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {builderModules.map((mod, modIdx) => {
                  const modLessons = builderLessons.filter((l) => l.moduleId === mod.id);
                  return (
                    <div key={mod.id} className="p-4 border border-ink-200 rounded-2xl bg-white space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => {
                            const updated = builderModules.map((m) => m.id === mod.id ? { ...m, title: e.target.value } : m);
                            setBuilderModules(updated);
                          }}
                          className="font-bold text-ink-900 text-sm bg-transparent border-b border-ink-200 focus:outline-none focus:border-primary-600 flex-1 py-1"
                        />
                        <button
                          onClick={() => setBuilderModules(builderModules.filter((m) => m.id !== mod.id))}
                          className="p-1 text-ink-400 hover:text-error-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 bg-ink-50/60 p-3 rounded-xl">
                        {modLessons.map((les) => (
                          <div key={les.id} className="p-3 bg-white border border-ink-200 rounded-xl flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary-600" />
                              <span className="font-semibold text-ink-900">{les.title}</span>
                              <Badge variant="neutral">{les.lessonType}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditingLessonId(les.id); setLessonForm(les); }}
                                className="text-xs text-primary-600 hover:underline"
                              >
                                Edit Content
                              </button>
                              <button
                                onClick={() => setBuilderLessons(builderLessons.filter((l) => l.id !== les.id))}
                                className="text-ink-400 hover:text-error-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => handleAddLessonToModule(mod.id)}
                          className="w-full py-2 border border-dashed border-ink-300 rounded-xl text-xs text-ink-600 hover:bg-white transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Lesson to {mod.title}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lesson Edit Form Drawer */}
              {editingLessonId && (
                <div className="p-4 bg-primary-50/50 border border-primary-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-xs uppercase text-primary-900 tracking-wider">Edit Lesson Details</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="Lesson title"
                      className="input text-xs"
                    />
                    <select
                      value={lessonForm.lessonType}
                      onChange={(e) => setLessonForm({ ...lessonForm, lessonType: e.target.value as LessonType })}
                      className="input text-xs"
                    >
                      <option value="VIDEO">Video Lesson</option>
                      <option value="PDF">PDF Document</option>
                      <option value="DOC">Word Document (DOCX)</option>
                      <option value="PPT">Presentation (PPTX)</option>
                      <option value="TEXT">Rich Text Article</option>
                      <option value="EXTERNAL_LINK">External Resource Link</option>
                      <option value="CODING_EXERCISE">Coding Exercise</option>
                      <option value="QUIZ">Quiz / Assessment</option>
                      <option value="ASSIGNMENT">Assignment Task</option>
                    </select>
                  </div>

                  {lessonForm.lessonType === 'VIDEO' && (
                    <input
                      type="text"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      placeholder="Video Stream URL (e.g. YouTube embed link or MP4 URL)"
                      className="input text-xs w-full"
                    />
                  )}

                  {lessonForm.lessonType === 'TEXT' && (
                    <textarea
                      value={lessonForm.richText}
                      onChange={(e) => setLessonForm({ ...lessonForm, richText: e.target.value })}
                      placeholder="Write lesson text content..."
                      className="input text-xs w-full min-h-[80px]"
                    />
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditingLessonId(null)} className="btn-secondary text-xs">Close</button>
                    <button
                      onClick={() => {
                        setBuilderLessons(builderLessons.map((l) => l.id === editingLessonId ? { ...l, ...lessonForm } as CourseLesson : l));
                        setEditingLessonId(null);
                      }}
                      className="btn-primary text-xs"
                    >
                      Save Lesson Content
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: File Resources & AI */}
          {step === 3 && (
            <div className="space-y-6">
              {/* AI Assistant Banner */}
              <div className="p-5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-warning-300" /> ✨ Skill Toss AI Course Assistant
                  </h3>
                  <p className="text-xs text-white/80 mt-1 max-w-lg">
                    Automatically generate course summaries, learning objectives, key concepts, quiz questions, and flashcards from your lesson content.
                  </p>
                </div>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-4 py-2 bg-white text-primary-700 font-bold rounded-xl text-xs shadow-md hover:bg-ink-50 transition"
                >
                  ✨ Generate with AI
                </button>
              </div>

              {/* Real File Attachment Storage */}
              <div className="space-y-3">
                <h4 className="font-bold text-ink-900 text-sm">Course Resource Attachments (PDF / DOC / PPT)</h4>
                <FileAttachmentPicker
                  ownerId={courseForm.id || 'course_new'}
                  ownerType="resource"
                  files={[]}
                  onChange={() => {}}
                  label="Upload Supplementary Material Files"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Preview & Submit */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-5 bg-ink-50 border border-ink-200 rounded-2xl space-y-3">
                <h3 className="font-bold text-ink-900 text-base">{courseForm.title || 'Untitled Course'}</h3>
                <p className="text-xs text-ink-600">{courseForm.description}</p>

                <div className="flex flex-wrap gap-4 text-xs text-ink-500 pt-2 border-t border-ink-200">
                  <span>Category: <strong>{courseForm.category}</strong></span>
                  <span>Level: <strong>{courseForm.level}</strong></span>
                  <span>Duration: <strong>{courseForm.durationHours} Hours</strong></span>
                  <span>Modules: <strong>{builderModules.length}</strong></span>
                  <span>Lessons: <strong>{builderLessons.length}</strong></span>
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-200 text-xs text-primary-900">
                <p className="font-bold mb-1">Status Workflow Notice:</p>
                <p>Clicking <strong>"Submit for Review"</strong> will update status to <strong>PENDING REVIEW</strong> and notify Administrators to review and publish your course.</p>
              </div>
            </div>
          )}

          {/* Modal Action Controls */}
          <div className="pt-4 border-t border-ink-200 flex items-center justify-between">
            <button onClick={handleSaveDraftAction} className="btn-secondary text-xs flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="btn-secondary text-xs">
                  ← Back
                </button>
              )}

              {step < 4 ? (
                <button onClick={() => setStep(step + 1)} className="btn-primary text-xs flex items-center gap-1">
                  Next Step →
                </button>
              ) : (
                <button onClick={handleSubmitForReviewAction} className="btn-primary text-xs flex items-center gap-1.5 shadow-sm">
                  <Send className="w-4 h-4" /> Submit for Review
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* AI Assistant Modal */}
      <AiCourseAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        contextTitle={courseForm.title}
        contextText={courseForm.description}
        onAcceptAiContent={(generated) => {
          setCourseForm({
            ...courseForm,
            objectivesText: generated.objectives.join('\n'),
          });
          setFeedback({ kind: 'success', message: 'AI generated content inserted into course builder.' });
        }}
      />

      {/* Admin Review Modal */}
      {showReviewModal && activeCourse && (
        <CourseReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          course={activeCourse}
          modules={(state.courseModules || []).filter((m) => m.courseId === activeCourse.id)}
          lessons={(state.courseLessons || []).filter((l) => l.courseId === activeCourse.id)}
          onApprove={(cId) => adminReviewCourse(cId, 'APPROVED', '', instructorName)}
          onRequestChanges={(cId, fb) => adminReviewCourse(cId, 'CHANGES_REQUESTED', fb, instructorName)}
          onReject={(cId) => adminReviewCourse(cId, 'REJECTED', 'Course did not meet standards.', instructorName)}
          onPublish={(cId) => adminReviewCourse(cId, 'PUBLISHED', '', instructorName)}
        />
      )}
    </div>
  );
}
