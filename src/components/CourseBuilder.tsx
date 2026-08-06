import { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle, Plus, Edit, Trash2, Save, X, Upload, Video, Clock,
  Layers, ChevronRight, ArrowLeft, Award, Eye, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type Course = {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_role: string;
  thumbnail: string;
  category: string;
  level: string;
  duration_hours: number;
  price: number;
  status: string;
  enrolled_count: number;
  created_at: string;
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

const STOCK_THUMBS = [
  'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1181376/pexels-photo-1181376.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600',
];

export function CourseBuilder({ instructorName, instructorRole }: { instructorName: string; instructorRole: 'admin' | 'teacher' }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('instructor_role', instructorRole)
      .order('created_at', { ascending: false });
    if (!error && data) setCourses(data as Course[]);
    setLoading(false);
  }, [instructorRole]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => { setSelectedCourse(null); fetchCourses(); }} />;
  }

  const published = courses.filter((c) => c.status === 'published');
  const drafts = courses.filter((c) => c.status === 'draft');

  return (
    <div>
      <PageHeader
        title={instructorRole === 'admin' ? 'Course Builder' : 'My Courses'}
        subtitle={instructorRole === 'admin' ? 'Create courses with video lessons — students see published courses' : 'Build courses with video lessons — admin reviews before publishing'}
        actions={<button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> New Course</button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Courses" value={courses.length} icon={PlayCircle} color="primary" />
        <StatCard label="Published" value={published.length} icon={Check} color="success" />
        <StatCard label="Drafts" value={drafts.length} icon={Edit} color="warning" />
        <StatCard label="Total Enrolled" value={courses.reduce((s, c) => s + c.enrolled_count, 0)} icon={Layers} color="accent" />
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse"><div className="h-32 bg-ink-100 rounded-xl mb-3" /><div className="h-4 bg-ink-100 rounded w-2/3 mb-2" /><div className="h-3 bg-ink-100 rounded w-1/2" /></div>)}
        </div>
      ) : courses.length === 0 ? (
        <Card><EmptyState icon={PlayCircle} title="No courses yet" description="Create your first course — add video lessons, topics, and a certificate template. Students will see published courses." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> New Course</button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} hover className="overflow-hidden">
              <div className="relative aspect-video bg-ink-100">
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><PlayCircle className="w-12 h-12 text-ink-300" /></div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={c.status} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink-900 text-sm">{c.title}</h3>
                <p className="text-xs text-ink-400 mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.duration_hours}h</span>
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {c.level}</span>
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {c.enrolled_count}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setSelectedCourse(c)} className="btn-secondary flex-1 text-xs"><Eye className="w-3.5 h-3.5" /> Manage</button>
                  <button onClick={() => { setEditing(c.id); setShowForm(true); }} className="p-2 rounded-lg hover:bg-ink-100 text-ink-400"><Edit className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && (
        <CourseForm
          courseId={editing}
          instructorName={instructorName}
          instructorRole={instructorRole}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchCourses(); }}
        />
      )}
    </div>
  );
}

function CourseForm({ courseId, instructorName, instructorRole, onClose, onSaved }: {
  courseId: string | null;
  instructorName: string;
  instructorRole: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [level, setLevel] = useState('Beginner');
  const [durationHours, setDurationHours] = useState(0);
  const [price, setPrice] = useState(0);
  const [status, setStatus] = useState('draft');
  const [thumbnail, setThumbnail] = useState(STOCK_THUMBS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      const { data } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
      if (data) {
        setTitle(data.title); setDescription(data.description); setCategory(data.category);
        setLevel(data.level); setDurationHours(data.duration_hours); setPrice(data.price);
        setStatus(data.status); setThumbnail(data.thumbnail || STOCK_THUMBS[0]);
      }
    })();
  }, [courseId]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (courseId) {
      await supabase.from('courses').update({
        title, description, category, level, duration_hours: durationHours,
        price, status, thumbnail, updated_at: new Date().toISOString(),
      }).eq('id', courseId);
    } else {
      await supabase.from('courses').insert({
        title, description, instructor_name: instructorName, instructor_role: instructorRole,
        thumbnail, category, level, duration_hours: durationHours, price, status,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={courseId ? 'Edit Course' : 'New Course'} size="lg">
      <div className="space-y-4">
        <div><label className="label">Course Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Structures & Algorithms" /></div>
        <div><label className="label">Description</label><textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {['General', 'Computer Science', 'Programming', 'Web Development', 'AI & ML', 'Mathematics', 'Business'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Level</label>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {['Beginner', 'Intermediate', 'Advanced'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">Duration (hrs)</label><input className="input" type="number" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} /></div>
          <div><label className="label">Price (₹)</label><input className="input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <div><label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Thumbnail</label>
          <div className="grid grid-cols-6 gap-2">
            {STOCK_THUMBS.map((t) => (
              <button key={t} onClick={() => setThumbnail(t)} className={cn('aspect-video rounded-lg overflow-hidden border-2', thumbnail === t ? 'border-primary-500' : 'border-transparent')}>
                <img src={t} alt="thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} className="btn-primary flex-1"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Course'}</button>
        </div>
      </div>
    </Modal>
  );
}

function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLesson, setShowLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true });
    if (!error && data) setLessons(data as Lesson[]);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const deleteLesson = async (id: string) => {
    await supabase.from('course_lessons').delete().eq('id', id);
    fetchLessons();
  };

  const totalDuration = lessons.reduce((s, l) => s + l.duration_minutes, 0);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-500 hover:text-primary-600 mb-4"><ArrowLeft className="w-4 h-4" /> Back to courses</button>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="relative aspect-video bg-ink-100">
            {course.thumbnail ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle className="w-16 h-16 text-ink-300" /></div>}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={course.status} />
              <Badge variant="primary">{course.level}</Badge>
              <Badge variant="accent">{course.category}</Badge>
            </div>
            <h2 className="text-xl font-bold font-display text-ink-900">{course.title}</h2>
            <p className="text-sm text-ink-500 mt-2">{course.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-ink-500">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration_hours}h total</span>
              <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {lessons.length} lessons</span>
              <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {course.enrolled_count} enrolled</span>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Course Actions</h3>
          <div className="space-y-2">
            <button onClick={() => { setEditingLesson(null); setShowLesson(true); }} className="btn-primary w-full text-sm"><Plus className="w-4 h-4" /> Add Lesson / Topic</button>
            <button onClick={() => setShowCert(true)} className="btn-secondary w-full text-sm"><Award className="w-4 h-4" /> Certificate Template</button>
            <div className="pt-3 border-t border-ink-100 text-sm text-ink-500 space-y-1">
              <p><span className="text-ink-400">Instructor:</span> {course.instructor_name}</p>
              <p><span className="text-ink-400">Price:</span> {course.price === 0 ? 'Free' : `₹${course.price}`}</p>
              <p><span className="text-ink-400">Status:</span> {course.status === 'published' ? 'Visible to students' : 'Draft — not visible'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Lessons & Topics" subtitle={`${lessons.length} lessons · ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m total`} />
        {loading ? (
          <div className="p-8 text-center text-ink-400">Loading...</div>
        ) : lessons.length === 0 ? (
          <EmptyState icon={Video} title="No lessons yet" description="Add your first video lesson — students will see these as topics in the course." action={<button onClick={() => { setEditingLesson(null); setShowLesson(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Lesson</button>} />
        ) : (
          <div className="p-4 space-y-2">
            {lessons.map((l, i) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-sm font-semibold text-primary-600">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{l.title}</p>
                  <p className="text-xs text-ink-400 truncate">{l.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <Clock className="w-3.5 h-3.5" /> {l.duration_minutes}m
                </div>
                <button onClick={() => { setEditingLesson(l.id); setShowLesson(true); }} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deleteLesson(l.id)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showLesson && (
        <LessonForm
          courseId={course.id}
          lessonId={editingLesson}
          nextOrder={lessons.length}
          onClose={() => setShowLesson(false)}
          onSaved={() => { setShowLesson(false); fetchLessons(); }}
        />
      )}
      {showCert && (
        <CertTemplateEditor courseId={course.id} courseTitle={course.title} onClose={() => setShowCert(false)} />
      )}
    </div>
  );
}

function LessonForm({ courseId, lessonId, nextOrder, onClose, onSaved }: {
  courseId: string;
  lessonId: string | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      const { data } = await supabase.from('course_lessons').select('*').eq('id', lessonId).maybeSingle();
      if (data) {
        setTitle(data.title); setDescription(data.description);
        setVideoUrl(data.video_url); setDuration(data.duration_minutes);
      }
    })();
  }, [lessonId]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (lessonId) {
      await supabase.from('course_lessons').update({
        title, description, video_url: videoUrl, duration_minutes: duration,
      }).eq('id', lessonId);
    } else {
      await supabase.from('course_lessons').insert({
        course_id: courseId, title, description, video_url: videoUrl,
        duration_minutes: duration, sort_order: nextOrder,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={lessonId ? 'Edit Lesson' : 'Add Lesson / Topic'} size="md">
      <div className="space-y-4">
        <div><label className="label">Lesson Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Arrays" /></div>
        <div><label className="label">Description</label><textarea className="input min-h-16" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this lesson cover?" /></div>
        <div><label className="label">Video URL</label><input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://...mp4 or YouTube/Vimeo link" /></div>
        <div className="flex items-center gap-2 p-3 bg-ink-50 rounded-xl text-sm text-ink-500">
          <Upload className="w-4 h-4" /> Paste a video link (MP4, YouTube, or Vimeo). Direct file upload can be added later.
        </div>
        <div><label className="label">Duration (minutes)</label><input className="input" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} className="btn-primary flex-1"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Lesson'}</button>
        </div>
      </div>
    </Modal>
  );
}

function CertTemplateEditor({ courseId, courseTitle, onClose }: { courseId: string; courseTitle: string; onClose: () => void }) {
  const [title, setTitle] = useState('Certificate of Completion');
  const [issuedBy, setIssuedBy] = useState('Bright Future College');
  const [signatureText, setSignatureText] = useState('Director of Studies');
  const [borderStyle, setBorderStyle] = useState('Classic');
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('certificate_templates').select('*').eq('course_id', courseId).maybeSingle();
      if (data) {
        setExistingId(data.id);
        setTitle(data.title); setIssuedBy(data.issued_by);
        setSignatureText(data.signature_text); setBorderStyle(data.border_style);
      }
    })();
  }, [courseId]);

  const save = async () => {
    setSaving(true);
    if (existingId) {
      await supabase.from('certificate_templates').update({
        title, issued_by: issuedBy, signature_text: signatureText, border_style: borderStyle,
      }).eq('id', existingId);
    } else {
      await supabase.from('certificate_templates').insert({
        course_id: courseId, title, issued_by: issuedBy, signature_text: signatureText, border_style: borderStyle,
      });
    }
    setSaving(false);
    onClose();
  };

  const borderColors: Record<string, string> = {
    Classic: 'border-primary-600', Modern: 'border-accent-600',
    Elegant: 'border-success-600', Minimal: 'border-ink-400',
  };

  return (
    <Modal open onClose={onClose} title="Certificate Template" size="lg">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div><label className="label">Certificate Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="label">Course Name</label><input className="input" defaultValue={courseTitle} disabled /></div>
          <div><label className="label">Issued By</label><input className="input" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} /></div>
          <div><label className="label">Signature Line Text</label><input className="input" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} /></div>
          <div>
            <label className="label">Border Style</label>
            <div className="flex gap-2">
              {['Classic', 'Modern', 'Elegant', 'Minimal'].map((s) => (
                <button key={s} onClick={() => setBorderStyle(s)} className={cn('px-3 py-2 rounded-lg text-sm border-2', borderStyle === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-ink-200 text-ink-600 hover:border-ink-300')}>{s}</button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="btn-primary w-full"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Template'}</button>
        </div>
        <div>
          <h3 className="font-semibold text-ink-900 mb-3 text-sm">Live Preview</h3>
          <div className={cn('rounded-xl border-4 p-6 bg-gradient-to-br from-primary-50 to-accent-50 text-center', borderColors[borderStyle])}>
            <div className="w-14 h-14 rounded-full bg-primary-600 mx-auto mb-3 flex items-center justify-center text-white"><Award className="w-7 h-7" /></div>
            <p className="text-xs text-ink-500 uppercase tracking-widest">{title}</p>
            <h2 className="text-lg font-bold font-display text-ink-900 mt-2">{courseTitle}</h2>
            <p className="text-sm text-ink-500 mt-3">This certifies that</p>
            <p className="text-lg font-semibold text-primary-700 mt-1">{'{{student_name}}'}</p>
            <p className="text-sm text-ink-500 mt-2">has successfully completed the course</p>
            <div className="mt-5 flex justify-between items-end text-xs text-ink-500">
              <div><p className="font-semibold text-ink-700">{issuedBy}</p><p>Issued On</p></div>
              <div><p className="font-semibold text-ink-700">{signatureText}</p><p>Signature</p></div>
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-3 text-center">Auto-sent to student's WhatsApp & email upon course completion</p>
        </div>
      </div>
    </Modal>
  );
}
