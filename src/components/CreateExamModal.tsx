import React, { useState } from 'react';
import { X, Calendar, Clock, BookOpen, Layers, Award, FileText, Plus, Trash2, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useLmsData } from '../lib/lmsDataContext';
import { LmsExam, ExamType, ExamQuestion } from '../lib/types';
import { Button } from './ui/Button';
import { FileAttachmentPicker } from './FileAttachmentPicker';
import { SubmissionAttachment } from '../lib/types';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialExam?: LmsExam | null;
  teacherId?: string;
  teacherName?: string;
}

export function CreateExamModal({
  isOpen,
  onClose,
  initialExam,
  teacherId,
  teacherName,
}: CreateExamModalProps) {
  const { state, saveOrUpdateExam, checkScheduleConflict } = useLmsData();

  const [title, setTitle] = useState(initialExam?.title || '');
  const [courseId, setCourseId] = useState(initialExam?.courseId || (state.courses[0]?.id || 'course_ds'));
  const [batchId, setBatchId] = useState(initialExam?.batchId || (state.batches[0]?.id || 'batch_001'));
  const [subject, setSubject] = useState(initialExam?.subject || 'Data Structures & Algorithms');
  const [examType, setExamType] = useState<ExamType>((initialExam?.examType as ExamType) || 'internal');
  const [date, setDate] = useState(initialExam?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(initialExam?.startTime || '10:00');
  const [durationMinutes, setDurationMinutes] = useState(initialExam?.durationMinutes || 60);
  const [maxMarks, setMaxMarks] = useState(initialExam?.maxMarks || 50);
  const [passingMarks, setPassingMarks] = useState(initialExam?.passingMarks || 20);
  const [syllabus, setSyllabus] = useState(initialExam?.syllabus || '');
  const [instructions, setInstructions] = useState(initialExam?.instructions || '1. All questions are compulsory.\n2. Maintain academic integrity.\n3. Submit before timer expires.');

  // Questions tab state
  const [questionsMode, setQuestionsMode] = useState<'create' | 'upload'>('create');
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialExam?.questions || []);
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>(initialExam?.attachments || []);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<{ metadata: SubmissionAttachment; file?: File }>>([]);

  // Question form state
  const [qText, setQText] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qMarks, setQMarks] = useState(5);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    if (!qText.trim()) return;
    const newQ: ExamQuestion = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      questionText: qText.trim(),
      optionA: qOptA.trim() || undefined,
      optionB: qOptB.trim() || undefined,
      optionC: qOptC.trim() || undefined,
      optionD: qOptD.trim() || undefined,
      correctOption: qCorrect,
      marks: qMarks,
    };
    setQuestions([...questions, newQ]);
    setQText('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSave = async (status: 'draft' | 'scheduled') => {
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter an Assessment Title.');
      return;
    }
    if (!date) {
      setErrorMsg('Please select a valid Exam Date.');
      return;
    }
    if (durationMinutes <= 0) {
      setErrorMsg('Duration must be greater than 0 minutes.');
      return;
    }
    if (maxMarks <= 0) {
      setErrorMsg('Maximum marks must be greater than 0.');
      return;
    }
    if (passingMarks > maxMarks) {
      setErrorMsg('Passing marks cannot exceed Maximum marks.');
      return;
    }

    // Check schedule conflict
    if (status === 'scheduled') {
      const parts = startTime.split(':');
      const h = parseInt(parts[0], 10) || 10;
      const m = parseInt(parts[1], 10) || 0;
      const endMins = h * 60 + m + Number(durationMinutes);
      const endH = Math.floor(endMins / 60) % 24;
      const endM = endMins % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const conflictCheck = checkScheduleConflict(
        batchId,
        teacherId || 'teacher_001',
        date,
        startTime,
        endTimeStr,
        initialExam?.id
      );

      if (conflictCheck.hasConflict) {
        setErrorMsg(`Schedule Conflict Warning: "${conflictCheck.conflictingEvent?.title}" is already scheduled at this time for this batch.`);
        return;
      }
    }

    setLoading(true);

    const courseObj = state.courses.find((c) => c.id === courseId);
    const batchObj = state.batches.find((b) => b.id === batchId);

    const examData: Partial<LmsExam> = {
      id: initialExam?.id,
      title: title.trim(),
      courseId,
      courseTitle: courseObj?.title || 'Data Structures',
      batchId,
      batchName: batchObj?.name || 'CS-2024-A',
      subject: subject.trim() || courseObj?.category || 'Computer Science',
      teacherId: teacherId || 'teacher_001',
      teacherName: teacherName || 'Sneha Kapoor',
      examType,
      date,
      startTime,
      durationMinutes: Number(durationMinutes),
      maxMarks: Number(maxMarks),
      passingMarks: Number(passingMarks),
      syllabus: syllabus.trim(),
      instructions: instructions.trim(),
      questions,
      attachmentName: attachmentFiles[0]?.metadata?.fileName || initialExam?.attachmentName,
      attachments: attachmentFiles.map((a) => a.metadata),
      status,
    };

    const res = await saveOrUpdateExam(examData);
    setLoading(false);

    if (res.ok) {
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-ink-900/5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-200">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">
                {initialExam ? 'Edit Assessment' : 'Schedule New Assessment'}
              </h2>
              <p className="text-xs text-ink-500">Configure exam parameters, syllabus, questions & scheduling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-xs text-error-700 ring-1 ring-error-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Title & Exam Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Assessment Title <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Data Structures Mid-Semester Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Exam Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
              >
                <option value="internal">Internal Exam</option>
                <option value="quiz">Pop Quiz</option>
                <option value="mid_semester">Mid-Semester Exam</option>
                <option value="final">Final Term Exam</option>
                <option value="assignment_test">Assignment Test</option>
                <option value="practice_test">Practice Test</option>
              </select>
            </div>
          </div>

          {/* Course, Batch, Subject */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Target Course</label>
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  const c = state.courses.find((x) => x.id === e.target.value);
                  if (c) setSubject(c.category || 'Computer Science');
                }}
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
              >
                {state.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Target Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
              >
                {state.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.departmentId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {/* Schedule Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3.5 rounded-xl bg-ink-50/70 border border-ink-100">
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary-500" /> Exam Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary-500" /> Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Duration (Mins)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 mb-1">Max / Pass Marks</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  placeholder="Max"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-900 bg-white"
                />
                <span className="text-xs text-ink-400">/</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Pass"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Syllabus & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Syllabus / Topics Covered</label>
              <textarea
                rows={2}
                placeholder="e.g. Arrays, Linked Lists, Stacks, Queues, Binary Trees..."
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                className="w-full rounded-xl border border-ink-200 p-2.5 text-xs text-ink-900 focus:border-primary-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Exam Instructions for Students</label>
              <textarea
                rows={2}
                placeholder="e.g. 1. All questions are compulsory. 2. Submissions close automatically."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full rounded-xl border border-ink-200 p-2.5 text-xs text-ink-900 focus:border-primary-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Question Paper Mode Selector */}
          <div className="border-t border-ink-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">Question Paper & Content</h3>
              <div className="flex items-center gap-1 bg-ink-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuestionsMode('create')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    questionsMode === 'create' ? 'bg-white text-primary-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  Interactive Questions ({questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionsMode('upload')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    questionsMode === 'upload' ? 'bg-white text-primary-700 shadow-xs' : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  Upload Question Document
                </button>
              </div>
            </div>

            {questionsMode === 'create' ? (
              <div className="space-y-4 rounded-xl bg-ink-50/50 p-4 border border-ink-100">
                {/* Existing questions list */}
                {questions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="flex items-start justify-between rounded-lg bg-white p-3 border border-ink-200 shadow-2xs">
                        <div>
                          <p className="text-xs font-bold text-ink-900">
                            Q{idx + 1}. {q.questionText} <span className="text-primary-600 font-medium">({q.marks || 5} Marks)</span>
                          </p>
                          {q.optionA && (
                            <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-ink-600">
                              <span className={q.correctOption === 'A' ? 'font-bold text-success-700' : ''}>A. {q.optionA}</span>
                              <span className={q.correctOption === 'B' ? 'font-bold text-success-700' : ''}>B. {q.optionB}</span>
                              <span className={q.correctOption === 'C' ? 'font-bold text-success-700' : ''}>C. {q.optionC}</span>
                              <span className={q.correctOption === 'D' ? 'font-bold text-success-700' : ''}>D. {q.optionD}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-error-500 hover:text-error-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new question box */}
                <div className="rounded-xl bg-white p-3.5 border border-ink-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-800">Add Question #{questions.length + 1}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-ink-600">Marks:</label>
                      <input
                        type="number"
                        min="1"
                        value={qMarks}
                        onChange={(e) => setQMarks(Number(e.target.value))}
                        className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Enter question statement..."
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-900"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Option A"
                      value={qOptA}
                      onChange={(e) => setQOptA(e.target.value)}
                      className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Option B"
                      value={qOptB}
                      onChange={(e) => setQOptB(e.target.value)}
                      className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Option C"
                      value={qOptC}
                      onChange={(e) => setQOptC(e.target.value)}
                      className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Option D"
                      value={qOptD}
                      onChange={(e) => setQOptD(e.target.value)}
                      className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-ink-700">Correct Option:</span>
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <label key={opt} className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={qCorrect === opt}
                            onChange={() => setQCorrect(opt)}
                            className="text-primary-600"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>

                    <Button type="button" variant="secondary" size="sm" onClick={handleAddQuestion} icon={Plus}>
                      Add Question
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-ink-50/50 p-4 border border-ink-100">
                <p className="text-xs text-ink-600 mb-3">
                  Upload complete Question Paper file (PDF, DOCX, DOC, XLSX, CSV max 10MB). Students will be able to download/view the question paper during the exam.
                </p>
                <FileAttachmentPicker
                  ownerType="assignment"
                  ownerId={initialExam?.id || 'new_exam'}
                  files={attachmentFiles}
                  onChange={setAttachmentFiles}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-ink-100 pt-4 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => handleSave('draft')}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSave('scheduled')}
              disabled={loading}
              icon={CheckCircle}
            >
              {loading ? 'Saving...' : 'Schedule Exam'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
