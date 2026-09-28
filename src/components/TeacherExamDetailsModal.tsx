import React, { useState } from 'react';
import { X, Calendar, Clock, Award, Users, CheckCircle, Clock3, AlertCircle, FileText, Download, Send, Edit3, BarChart2 } from 'lucide-react';
import { useLmsData } from '../lib/lmsDataContext';
import { LmsExam, LmsExamResult } from '../lib/types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface TeacherExamDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: LmsExam;
}

export function TeacherExamDetailsModal({
  isOpen,
  onClose,
  exam,
}: TeacherExamDetailsModalProps) {
  const { state, getExamAnalytics, evaluateExamSubmission, publishExamResults } = useLmsData();

  const analytics = getExamAnalytics(exam.id);
  const submissions = (state.examResults || []).filter((r) => r.examId === exam.id);
  const batchStudents = state.students.filter((s) => s.batchId === exam.batchId || (s as any).batch === exam.batchName);

  // Submissions roster combined with batch students
  const roster = (batchStudents.length > 0 ? batchStudents : Array.from({ length: 15 }, (_, i) => ({
    id: `demo_std_${i + 1}`,
    name: `Student ${i + 1}`,
    rollNo: `CS-2024-${100 + i + 1}`,
    batchId: exam.batchId,
  }))).map((student) => {
    const sub = submissions.find((r) => r.studentId === student.id || r.studentName === student.name);
    return {
      studentId: student.id,
      studentName: student.name,
      rollNo: (student as any).rollNo || `CS-2024-10${student.id.slice(-2)}`,
      submission: sub || null,
    };
  });

  const [activeSub, setActiveSub] = useState<LmsExamResult | null>(null);
  const [evalMarks, setEvalMarks] = useState<number>(0);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  if (!isOpen) return null;

  const handleOpenEvaluate = (sub: LmsExamResult | null, studentName: string, studentId: string, rollNo: string) => {
    if (sub) {
      setActiveSub(sub);
      setEvalMarks(sub.marks || 0);
      setEvalFeedback(sub.feedback || '');
    } else {
      setActiveSub({
        id: `sub_exam_${exam.id}_${studentId}`,
        examId: exam.id,
        studentId,
        studentName,
        rollNo,
        marks: 0,
        maxMarks: exam.maxMarks,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
      setEvalMarks(0);
      setEvalFeedback('');
    }
  };

  const handleSaveEvaluation = async () => {
    if (!activeSub) return;
    setEvaluating(true);
    await evaluateExamSubmission(activeSub.id, Number(evalMarks), evalFeedback);
    setEvaluating(false);
    setActiveSub(null);
  };

  const handlePublish = async () => {
    setPublishing(true);
    await publishExamResults(exam.id);
    setPublishing(false);
  };

  const statusBadgeVariant = (st: string) => {
    switch (st) {
      case 'results_published': return 'success';
      case 'live': return 'warning';
      case 'scheduled': return 'primary';
      case 'evaluation_pending': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-ink-900/5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ink-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusBadgeVariant(exam.status)}>
                {exam.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-xs font-semibold text-ink-500">{exam.courseTitle} • {exam.batchName}</span>
            </div>
            <h2 className="text-xl font-bold text-ink-900">{exam.title}</h2>
            <p className="text-xs text-ink-500 mt-0.5">{exam.subject} | Date: {exam.date} at {exam.startTime} ({exam.durationMinutes} Mins)</p>
          </div>

          <div className="flex items-center gap-2">
            {exam.status !== 'results_published' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                disabled={publishing}
                icon={Send}
              >
                {publishing ? 'Publishing...' : 'Publish Results'}
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="rounded-xl bg-ink-50/80 p-3 text-center border border-ink-100">
            <span className="block text-[10px] font-bold text-ink-400 uppercase tracking-wider">TOTAL STUDENTS</span>
            <span className="text-lg font-extrabold text-ink-900">{analytics.totalStudents}</span>
          </div>
          <div className="rounded-xl bg-primary-50/70 p-3 text-center border border-primary-100">
            <span className="block text-[10px] font-bold text-primary-600 uppercase tracking-wider">SUBMISSIONS</span>
            <span className="text-lg font-extrabold text-primary-700">{analytics.submittedCount} / {analytics.totalStudents}</span>
          </div>
          <div className="rounded-xl bg-warning-50/70 p-3 text-center border border-warning-100">
            <span className="block text-[10px] font-bold text-warning-700 uppercase tracking-wider">PENDING EVAL</span>
            <span className="text-lg font-extrabold text-warning-800">{analytics.pendingCount}</span>
          </div>
          <div className="rounded-xl bg-success-50/70 p-3 text-center border border-success-100">
            <span className="block text-[10px] font-bold text-success-700 uppercase tracking-wider">EVALUATED</span>
            <span className="text-lg font-extrabold text-success-800">{analytics.evaluatedCount}</span>
          </div>
          <div className="rounded-xl bg-accent-50/70 p-3 text-center border border-accent-100">
            <span className="block text-[10px] font-bold text-accent-700 uppercase tracking-wider">AVG SCORE</span>
            <span className="text-lg font-extrabold text-accent-800">{analytics.averageScore}%</span>
          </div>
          <div className="rounded-xl bg-ink-50/80 p-3 text-center border border-ink-100">
            <span className="block text-[10px] font-bold text-ink-400 uppercase tracking-wider">PASS RATE</span>
            <span className="text-lg font-extrabold text-ink-900">{analytics.passPercentage}%</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {/* Syllabus & Instructions */}
          {(exam.syllabus || exam.instructions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-ink-50/50 p-4 border border-ink-100">
              {exam.syllabus && (
                <div>
                  <h4 className="text-xs font-bold text-ink-800 mb-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary-500" /> Syllabus & Topics
                  </h4>
                  <p className="text-xs text-ink-600 leading-relaxed whitespace-pre-line">{exam.syllabus}</p>
                </div>
              )}
              {exam.instructions && (
                <div>
                  <h4 className="text-xs font-bold text-ink-800 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-warning-500" /> Exam Instructions
                  </h4>
                  <p className="text-xs text-ink-600 leading-relaxed whitespace-pre-line">{exam.instructions}</p>
                </div>
              )}
            </div>
          )}

          {/* Evaluate drawer modal */}
          {activeSub && (
            <div className="rounded-xl bg-primary-50/50 p-4 border border-primary-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-ink-900">
                    Evaluating Submission for: <span className="text-primary-700">{activeSub.studentName}</span> ({activeSub.rollNo})
                  </h3>
                  <p className="text-[11px] text-ink-500">Submitted at: {activeSub.submittedAt ? new Date(activeSub.submittedAt).toLocaleString() : 'Recent'}</p>
                </div>
                <button onClick={() => setActiveSub(null)} className="text-ink-400 hover:text-ink-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Answers preview if available */}
              {activeSub.answers && Object.keys(activeSub.answers).length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-ink-200 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="font-semibold text-ink-700 block text-[11px]">Submitted Answers:</span>
                  {Object.entries(activeSub.answers).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-ink-600 border-b border-ink-100 pb-1">
                      <span className="font-medium text-ink-800">{key}:</span>
                      <span className="bg-ink-100 px-2 py-0.5 rounded-sm font-mono text-[11px]">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                    Marks Awarded (Max {exam.maxMarks})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={exam.maxMarks}
                    value={evalMarks}
                    onChange={(e) => setEvalMarks(Number(e.target.value))}
                    className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-900 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-ink-700 mb-1">Teacher Feedback & Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent understanding of graph algorithms."
                    value={evalFeedback}
                    onChange={(e) => setEvalFeedback(e.target.value)}
                    className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setActiveSub(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveEvaluation} disabled={evaluating}>
                  {evaluating ? 'Saving...' : 'Save & Grade Submission'}
                </Button>
              </div>
            </div>
          )}

          {/* Student Submissions Roster */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                Student Submissions Roster ({submissions.length} / {roster.length})
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-50 text-[11px] font-semibold text-ink-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Roll No</th>
                    <th className="px-4 py-2.5">Submitted At</th>
                    <th className="px-4 py-2.5">Marks / Score</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 bg-white">
                  {roster.map((row) => {
                    const sub = row.submission;
                    const isEvaluated = sub?.status === 'evaluated';
                    const isSubmitted = sub && (sub.status === 'submitted' || isEvaluated);
                    const pct = sub?.percentage ?? (sub ? Math.round((sub.marks / exam.maxMarks) * 100) : 0);

                    return (
                      <tr key={row.studentId} className="hover:bg-ink-50/50">
                        <td className="px-4 py-3 font-semibold text-ink-900">{row.studentName}</td>
                        <td className="px-4 py-3 text-ink-500 font-mono text-[11px]">{row.rollNo}</td>
                        <td className="px-4 py-3 text-ink-500">
                          {sub?.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {sub ? (
                            <span className={pct >= 40 ? 'text-success-700 font-bold' : 'text-error-700 font-bold'}>
                              {sub.marks} / {exam.maxMarks} ({pct}%)
                            </span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEvaluated ? (
                            <Badge variant="success" size="sm">GRADED</Badge>
                          ) : isSubmitted ? (
                            <Badge variant="warning" size="sm">PENDING EVAL</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">NOT SUBMITTED</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={isEvaluated ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleOpenEvaluate(sub, row.studentName, row.studentId, row.rollNo)}
                            icon={Edit3}
                          >
                            {isEvaluated ? 'Edit Grade' : 'Evaluate'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-ink-100 pt-4 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
