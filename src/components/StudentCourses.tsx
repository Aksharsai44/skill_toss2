import { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, Play, Clock, Layers, Award, ChevronRight, ArrowLeft,
  Check, Download, Lock, BookOpen, Video,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

type Course = {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  thumbnail: string;
  category: string;
  level: string;
  duration_hours: number;
  price: number;
  status: string;
  enrolled_count: number;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string;
  duration_minutes: number;
  sort_order: number;
};

export function StudentCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (!error && data) setCourses(data as Course[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  if (selected) {
    return <CourseViewer course={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHeader title="Courses" subtitle="Browse and learn from courses created by your teachers" />
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse"><div className="h-32 bg-ink-100 rounded-xl mb-3" /><div className="h-4 bg-ink-100 rounded w-2/3 mb-2" /><div className="h-3 bg-ink-100 rounded w-1/2" /></div>)}
        </div>
      ) : courses.length === 0 ? (
        <Card><EmptyState icon={PlayCircle} title="No courses available" description="Your teachers haven't published any courses yet. Check back soon!" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} hover className="overflow-hidden cursor-pointer" >
              <div className="relative aspect-video bg-ink-100" onClick={() => setSelected(c)}>
                {c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle className="w-12 h-12 text-ink-300" /></div>}
                <div className="absolute inset-0 bg-ink-950/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-6 h-6 text-primary-600 ml-0.5" /></div>
                </div>
              </div>
              <div className="p-4" onClick={() => setSelected(c)}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary">{c.level}</Badge>
                  <Badge variant="accent">{c.category}</Badge>
                </div>
                <h3 className="font-semibold text-ink-900 text-sm">{c.title}</h3>
                <p className="text-xs text-ink-400 mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.duration_hours}h</span>
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {c.enrolled_count} enrolled</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-primary-600">{c.price === 0 ? 'Free' : `₹${c.price}`}</span>
                  <button className="btn-primary text-xs px-3 py-1.5">Start Course <ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseViewer({ course, onBack }: { course: Course; onBack: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setLessons(data as Lesson[]);
      if (data.length > 0) setActiveLesson(data[0] as Lesson);
    }
    setLoading(false);
  }, [course.id]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const progress = lessons.length > 0 ? Math.round((completed.size / lessons.length) * 100) : 0;
  const allDone = lessons.length > 0 && completed.size === lessons.length;

  const toggleComplete = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCompleted(next);
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-500 hover:text-primary-600 mb-4"><ArrowLeft className="w-4 h-4" /> Back to courses</button>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="relative aspect-video bg-ink-900">
            {activeLesson?.video_url ? (
              <div className="w-full h-full flex items-center justify-center">
                <video src={activeLesson.video_url} controls className="w-full h-full" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-ink-400">
                {course.thumbnail ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-30" /> : null}
                <div className="absolute flex flex-col items-center">
                  <Video className="w-16 h-16 mb-2" />
                  <p className="text-sm">{activeLesson ? 'No video uploaded for this lesson' : 'Select a lesson to start watching'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold font-display text-ink-900">{activeLesson?.title || course.title}</h2>
            <p className="text-sm text-ink-500 mt-1">{activeLesson?.description || course.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-ink-500">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {activeLesson?.duration_minutes || course.duration_hours * 60}m</span>
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> by {course.instructor_name}</span>
            </div>
            {activeLesson && (
              <button onClick={() => toggleComplete(activeLesson.id)} className={cn('mt-4 text-sm px-4 py-2 rounded-xl flex items-center gap-2', completed.has(activeLesson.id) ? 'bg-success-50 text-success-700' : 'btn-primary')}>
                <Check className="w-4 h-4" /> {completed.has(activeLesson.id) ? 'Completed' : 'Mark as Complete'}
              </button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-1">Course Progress</h3>
          <div className="mt-3 h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-xs text-ink-500 mt-1">{progress}% complete · {completed.size} of {lessons.length} lessons</p>
          {allDone && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-success-50 to-primary-50 border border-success-200">
              <div className="flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-success-600" /><span className="font-semibold text-ink-900 text-sm">Course Completed!</span></div>
              <p className="text-xs text-ink-500 mb-3">Your certificate is ready — sent to your WhatsApp & email.</p>
              <button className="btn-primary w-full text-sm"><Download className="w-4 h-4" /> Download Certificate</button>
            </div>
          )}
          {!allDone && (
            <div className="mt-4 p-3 rounded-xl bg-ink-50 text-xs text-ink-500 flex items-center gap-2">
              <Award className="w-4 h-4 text-ink-400" /> Complete all lessons to unlock your certificate.
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Course Content" subtitle={`${lessons.length} lessons`} />
        {loading ? (
          <div className="p-8 text-center text-ink-400">Loading...</div>
        ) : lessons.length === 0 ? (
          <EmptyState icon={PlayCircle} title="No lessons yet" description="Your teacher hasn't added lessons to this course yet." />
        ) : (
          <div className="p-4 space-y-1">
            {lessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => setActiveLesson(l)}
                className={cn('w-full flex items-center gap-3 p-3 rounded-xl text-left transition', activeLesson?.id === l.id ? 'bg-primary-50' : 'hover:bg-ink-50')}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm', completed.has(l.id) ? 'bg-success-100 text-success-600' : activeLesson?.id === l.id ? 'bg-primary-100 text-primary-600' : 'bg-ink-100 text-ink-500')}>
                  {completed.has(l.id) ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{l.title}</p>
                  <p className="text-xs text-ink-400 truncate">{l.description}</p>
                </div>
                <span className="text-xs text-ink-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {l.duration_minutes}m</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
