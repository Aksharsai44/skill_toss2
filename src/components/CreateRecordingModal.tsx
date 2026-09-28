import React, { useState } from 'react';
import { X, Upload, Video, Sparkles, AlertCircle } from 'lucide-react';
import type { LmsBatch, LmsCourse, ClassRecording } from '@/lib/types';

interface CreateRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: LmsCourse[];
  batches: LmsBatch[];
  teacherName?: string;
  teacherId?: string;
  onSave: (recording: Omit<ClassRecording, 'id' | 'createdAt' | 'viewsCount' | 'attendees'> & { attendees?: number }) => Promise<any>;
}

export function CreateRecordingModal({
  isOpen,
  onClose,
  courses,
  batches,
  teacherName = 'Sneha Kapoor',
  teacherId = 'teacher_001',
  onSave,
}: CreateRecordingModalProps) {
  const [title, setTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || 'course_ds');
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || 'batch_001');
  const [subject, setSubject] = useState('Computer Science');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('01:30:00');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [status, setStatus] = useState<'ready' | 'processing'>('ready');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a recording title.');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMessage('Please enter a valid video stream URL.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const selectedBatch = batches.find((b) => b.id === selectedBatchId);

    try {
      const res = await onSave({
        title: title.trim(),
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || 'Data Structures',
        subject: subject.trim() || selectedCourse?.category || 'Computer Science',
        batchId: selectedBatchId,
        batchName: selectedBatch?.name || 'CS-2024-A',
        batch: selectedBatch?.name || 'CS-2024-A',
        teacherId,
        teacherName,
        date,
        duration,
        videoUrl: videoUrl.trim(),
        thumbnail: selectedCourse?.thumbnail || 'https://images.pexels.com/photos/6147276/pexels-photo-6147276.jpeg?auto=compress&cs=tinysrgb&w=400',
        status,
      });

      if (res && res.ok === false) {
        setErrorMessage(res.message || 'Failed to save recording.');
      } else {
        onClose();
        // Reset form
        setTitle('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while publishing recording.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleVideoOptions = [
    { label: 'Big Buck Bunny (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { label: 'Elephants Dream (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { label: 'Tech Demo Stream (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-600">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink-900">Publish Class Recording</h2>
              <p className="text-xs text-ink-500">Upload or link recorded class video for your students</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Recording Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures — Linked Lists & Arrays"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Course & Batch Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  const c = courses.find((crs) => crs.id === e.target.value);
                  if (c) setSubject(c.category || 'Computer Science');
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Target Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Class Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Duration</label>
              <input
                type="text"
                placeholder="e.g. 1h 45m"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Video URL & Sample Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-ink-700">
                Video Stream URL / File Link <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-ink-400">MP4, WebM or HLS stream</span>
            </div>

            <input
              type="url"
              required
              placeholder="https://storage.googleapis.com/sample-videos/class_recording.mp4"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono text-ink-800"
            />

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-ink-400 font-medium mr-1">Quick Sample URLs:</span>
              {sampleVideoOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVideoUrl(opt.url)}
                  className="text-[10px] px-2 py-1 rounded bg-ink-100 text-ink-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Processing Status */}
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Initial Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('ready')}
                className={`p-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  status === 'ready'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                🟢 Ready for Playback
              </button>

              <button
                type="button"
                onClick={() => setStatus('processing')}
                className={`p-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  status === 'processing'
                    ? 'border-warning-500 bg-warning-50/50 text-warning-700 ring-2 ring-warning-500/20'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                ⏳ Processing / Encoding
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-ink-100 bg-ink-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Publish Recording
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
