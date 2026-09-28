import { useState, useEffect } from 'react';
import {
  PlayCircle, Search, Clock, Layers, Award, CheckCircle2,
  BookOpen, Filter, ArrowRight, Sparkles, User, Check
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import type { LmsCourse, CourseModule, CourseLesson } from '@/lib/types';
import { PageHeader, Card, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { CourseLearningPlayer } from '@/components/courses/CourseLearningPlayer';

export function StudentCourses() {
  const { state, enrollStudentInCourse, markLessonComplete } = useLmsData();
  const { user, profile } = useAuth();

  const studentId = user?.id || 'student_001';
  const studentName = profile?.fullName || 'Alex Morgan';

  const [activeCourse, setActiveCourse] = useState<LmsCourse | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tabFilter, setTabFilter] = useState<'All' | 'Enrolled' | 'In Progress' | 'Completed'>('All');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [, setTriggerRender] = useState<number>(0);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel('skilltoss_courses_channel');
      bc.onmessage = () => {
        setTriggerRender((prev) => prev + 1);
      };
      return () => bc.close();
    } catch {}
  }, []);

  // Published or Approved courses available for students
  const publishedCourses = (state.courses || []).filter(
    (c) => c.status === 'PUBLISHED' || c.status === 'APPROVED'
  );

  const studentEnrollments = (state.courseEnrollments || []).filter((e) => e.studentId === studentId);
  const enrolledCourseIds = new Set(studentEnrollments.map((e) => e.courseId));
  const studentProgressList = (state.lessonProgress || []).filter((p) => p.studentId === studentId);

  const getCourseProgressPct = (courseId: string): number => {
    const cLessons = (state.courseLessons || []).filter((l) => l.courseId === courseId);
    if (cLessons.length === 0) return 0;
    const completedCount = cLessons.filter((l) =>
      studentProgressList.some((p) => p.lessonId === l.id)
    ).length;
    return Math.round((completedCount / cLessons.length) * 100);
  };

  const filteredCourses = publishedCourses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = levelFilter === 'All' || c.level === levelFilter;

    const isEnrolled = enrolledCourseIds.has(c.id);
    const progress = getCourseProgressPct(c.id);

    let matchesTab = true;
    if (tabFilter === 'Enrolled') matchesTab = isEnrolled;
    else if (tabFilter === 'In Progress') matchesTab = isEnrolled && progress > 0 && progress < 100;
    else if (tabFilter === 'Completed') matchesTab = isEnrolled && progress === 100;

    return matchesSearch && matchesLevel && matchesTab;
  });

  const enrolledCount = studentEnrollments.length;
  const completedCount = publishedCourses.filter((c) => enrolledCourseIds.has(c.id) && getCourseProgressPct(c.id) === 100).length;
  const avgProgress = enrolledCount > 0
    ? Math.round(studentEnrollments.reduce((sum, e) => sum + getCourseProgressPct(e.courseId), 0) / enrolledCount)
    : 0;

  if (activeCourse) {
    const cMods = (state.courseModules || []).filter((m) => m.courseId === activeCourse.id);
    const cLess = (state.courseLessons || []).filter((l) => l.courseId === activeCourse.id);
    const currentEnr = studentEnrollments.find((e) => e.courseId === activeCourse.id);

    return (
      <CourseLearningPlayer
        course={activeCourse}
        modules={cMods.length > 0 ? cMods : [{ id: 'mod_1', courseId: activeCourse.id, title: 'Module 1: Introduction', sortOrder: 1 }]}
        lessons={cLess.length > 0 ? cLess : [
          { id: 'les_1', courseId: activeCourse.id, moduleId: 'mod_1', title: 'Lesson 1.1: Core Concepts', lessonType: 'VIDEO', durationMinutes: 15, sortOrder: 1, videoUrl: 'https://www.youtube.com/watch?v=RBSGKlAvoiM' }
        ]}
        enrollment={currentEnr}
        progressList={studentProgressList}
        studentId={studentId}
        studentName={studentName}
        onBack={() => setActiveCourse(null)}
        onMarkLessonComplete={(lesId) => markLessonComplete(studentId, activeCourse.id, lesId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses & Learning Catalog"
        subtitle="Explore published courses, track your module progress, and launch interactive video, quiz, and coding lessons."
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available Courses" value={publishedCourses.length} icon={BookOpen} color="primary" />
        <StatCard label="Enrolled Courses" value={enrolledCount} icon={Layers} color="accent" />
        <StatCard label="Average Progress" value={`${avgProgress}%`} icon={CheckCircle2} color="success" />
        <StatCard label="Completed Courses" value={completedCount} icon={Award} color="warning" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-ink-50 p-2.5 rounded-2xl border border-ink-200/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Enrolled', 'In Progress', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabFilter(tab)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-medium transition',
                tabFilter === tab
                  ? 'bg-white text-primary-700 font-semibold shadow-xs border border-ink-200'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course title or instructor..."
              className="input pl-9 text-xs py-1.5 w-full bg-white"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="input text-xs py-1.5 bg-white"
          >
            <option value="All">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Courses Catalog Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-8 text-center">
          <EmptyState
            icon={BookOpen}
            title="No matching courses found"
            description="Try adjusting your search query or filters to discover available learning courses."
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => {
            const isEnrolled = enrolledCourseIds.has(c.id);
            const progress = getCourseProgressPct(c.id);
            const cMods = (state.courseModules || []).filter((m) => m.courseId === c.id);
            const cLess = (state.courseLessons || []).filter((l) => l.courseId === c.id);

            return (
              <Card key={c.id} className="overflow-hidden flex flex-col group hover:shadow-md transition">
                <div className="relative h-44 overflow-hidden bg-ink-100">
                  <img
                    src={c.thumbnail || 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600'}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant={isEnrolled ? (progress === 100 ? 'success' : 'primary') : 'neutral'}>
                      {isEnrolled ? (progress === 100 ? 'Completed ✓' : `${progress}% Progress`) : 'Available'}
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
                    <p className="text-xs text-ink-500 mt-1 line-clamp-2">{c.description || 'Comprehensive educational course with lessons, quizzes, and resources.'}</p>
                  </div>

                  {/* Instructor & Meta */}
                  <div className="flex items-center gap-2 text-xs text-ink-600">
                    <User className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                    <span>Instructor: <strong>{c.instructorName}</strong></span>
                  </div>

                  {/* Progress Bar if enrolled */}
                  {isEnrolled && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-ink-700">
                        <span>Course Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                    <span>{cMods.length || 3} Modules • {cLess.length || 10} Lessons</span>
                    <span>{c.enrolledCount || 14} Students</span>
                  </div>

                  {/* Action Button */}
                  {isEnrolled ? (
                    <button
                      onClick={() => setActiveCourse(c)}
                      className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      Continue Learning <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        enrollStudentInCourse(studentId, c.id);
                        setActiveCourse(c);
                      }}
                      className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-1.5"
                    >
                      Enroll & Start Learning
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
