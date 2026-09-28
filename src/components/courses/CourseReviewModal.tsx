import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Eye, Layers, Clock, Award,
  MessageSquare, Send, BookOpen, User, Check, Globe
} from 'lucide-react';
import type { LmsCourse, CourseModule, CourseLesson } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface CourseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: LmsCourse | null;
  modules: CourseModule[];
  lessons: CourseLesson[];
  onApprove: (courseId: string) => void;
  onRequestChanges: (courseId: string, feedback: string) => void;
  onReject: (courseId: string, reason?: string) => void;
  onPublish: (courseId: string) => void;
}

export function CourseReviewModal({
  isOpen,
  onClose,
  course,
  modules,
  lessons,
  onApprove,
  onRequestChanges,
  onReject,
  onPublish,
}: CourseReviewModalProps) {
  const [showFeedbackInput, setShowFeedbackInput] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview');

  if (!course) return null;

  const handleRequestChangesSubmit = () => {
    if (!feedbackText.trim()) return;
    onRequestChanges(course.id, feedbackText.trim());
    setShowFeedbackInput(false);
    setFeedbackText('');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Admin Review — ${course.title}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Status banner */}
        <div className="flex items-center justify-between p-4 bg-ink-50 rounded-2xl border border-ink-200/80">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                course.status === 'PUBLISHED' ? 'success' :
                course.status === 'APPROVED' ? 'accent' :
                course.status === 'PENDING_REVIEW' ? 'warning' :
                course.status === 'CHANGES_REQUESTED' ? 'warning' : 'neutral'
              }
            >
              STATUS: {course.status}
            </Badge>
            <span className="text-xs text-ink-500">Submitted by <strong>{course.instructorName}</strong> ({course.instructorRole})</span>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-ink-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition', activeTab === 'overview' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-ink-600')}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={cn('px-3 py-1 rounded-lg text-xs font-medium transition', activeTab === 'curriculum' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-ink-600')}
            >
              Curriculum ({modules.length} Modules)
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <div className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <img
                  src={course.thumbnail || 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=600'}
                  alt={course.title}
                  className="w-full h-44 object-cover rounded-2xl border border-ink-200"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-xl font-bold text-ink-900 font-display">{course.title}</h3>
                <p className="text-xs text-ink-600 leading-relaxed">{course.description || 'No description provided.'}</p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs text-ink-500">
                  <span className="flex items-center gap-1 font-medium"><Layers className="w-3.5 h-3.5 text-primary-600" /> {course.category}</span>
                  <span className="flex items-center gap-1 font-medium"><Award className="w-3.5 h-3.5 text-accent-600" /> {course.level}</span>
                  <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-warning-600" /> {course.durationHours || 0} Hours</span>
                  <span className="flex items-center gap-1 font-medium"><User className="w-3.5 h-3.5 text-success-600" /> {course.instructorName}</span>
                </div>
              </div>
            </div>

            {/* Objectives & Prerequisites */}
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-primary-50/50 rounded-2xl border border-primary-100">
                <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wider mb-2">Target Learning Objectives</h4>
                {course.learningObjectives && course.learningObjectives.length > 0 ? (
                  <ul className="space-y-1 text-xs text-primary-800">
                    {course.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" /> {obj}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-400 italic">No learning objectives specified.</p>
                )}
              </div>

              <div className="p-4 bg-accent-50/50 rounded-2xl border border-accent-100">
                <h4 className="text-xs font-bold text-accent-900 uppercase tracking-wider mb-2">Prerequisites & Target Skills</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-accent-900">Prerequisites:</span>
                    <p className="text-accent-800">{course.prerequisites?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-accent-900">Skills Gained:</span>
                    <p className="text-accent-800">{course.skillsGained?.join(', ') || 'General'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {modules.map((mod, modIdx) => {
              const modLessons = lessons.filter((l) => l.moduleId === mod.id);
              return (
                <div key={mod.id} className="p-4 border border-ink-200 rounded-2xl bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-ink-900 text-sm">Module {modIdx + 1}: {mod.title}</h4>
                    <span className="text-xs text-ink-500 font-medium">{modLessons.length} lessons</span>
                  </div>
                  <div className="divide-y divide-ink-100 bg-ink-50 rounded-xl p-2">
                    {modLessons.map((les) => (
                      <div key={les.id} className="py-2 px-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-ink-400" />
                          <span className="font-medium text-ink-800">{les.title}</span>
                        </div>
                        <Badge variant="neutral">{les.lessonType}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Request Changes feedback form */}
        {showFeedbackInput && (
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-2xl space-y-3">
            <h4 className="font-bold text-warning-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-warning-600" /> Admin Feedback for Requested Changes
            </h4>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Specify what needs improvement (e.g. Please add more content to Module 2)..."
              className="input w-full min-h-[90px] text-xs bg-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFeedbackInput(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleRequestChangesSubmit} disabled={!feedbackText.trim()} className="btn-primary text-xs flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Submit Change Request
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-ink-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedbackInput(!showFeedbackInput)}
              className="btn-secondary text-xs flex items-center gap-1.5 text-warning-700 hover:bg-warning-50"
            >
              <AlertTriangle className="w-4 h-4 text-warning-600" /> Request Changes
            </button>
            <button
              onClick={() => { onReject(course.id); onClose(); }}
              className="btn-secondary text-xs flex items-center gap-1.5 text-error-700 hover:bg-error-50"
            >
              <XCircle className="w-4 h-4 text-error-600" /> Reject
            </button>
          </div>

          <div className="flex items-center gap-2">
            {course.status !== 'APPROVED' && course.status !== 'PUBLISHED' && (
              <button
                onClick={() => { onApprove(course.id); onClose(); }}
                className="btn-primary text-xs flex items-center gap-1.5 bg-success-600 hover:bg-success-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Course
              </button>
            )}

            {course.status !== 'PUBLISHED' && (
              <button
                onClick={() => { onPublish(course.id); onClose(); }}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-4 h-4" /> Publish to Students Now
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
