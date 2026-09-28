import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, FileText, Send, Award, Download } from 'lucide-react';
import { useLmsData } from '../lib/lmsDataContext';
import { LmsExam, ExamQuestion } from '../lib/types';
import { Button } from './ui/Button';

interface StudentExamPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: LmsExam;
  studentId?: string;
  studentName?: string;
  rollNo?: string;
  batchId?: string;
}

export function StudentExamPlayerModal({
  isOpen,
  onClose,
  exam,
  studentId = 'student_001',
  studentName = 'Alex Mercer',
  rollNo = 'BFC-2024-001',
  batchId = 'batch_001',
}: StudentExamPlayerModalProps) {
  const { submitExamPaper, downloadResourceFile } = useLmsData();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState((exam.durationMinutes || 60) * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeftSeconds((exam.durationMinutes || 60) * 60);
    setAnswers({});
    setSubmitted(false);
  }, [isOpen, exam]);

  useEffect(() => {
    if (!isOpen || submitted || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, submitted, timeLeftSeconds]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleOptionChange = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleAutoSubmit = async () => {
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Auto-calculate MCQ objective marks if questions are present
    let autoMarks = 0;
    if (exam.questions && exam.questions.length > 0) {
      exam.questions.forEach((q) => {
        const userChoice = answers[q.id];
        if (userChoice && q.correctOption && userChoice === q.correctOption) {
          autoMarks += q.marks || 5;
        }
      });
    } else {
      // Default baseline estimate if manual question paper
      autoMarks = Math.round((exam.maxMarks || 50) * 0.75);
    }

    const res = await submitExamPaper({
      examId: exam.id,
      studentId,
      studentName,
      rollNo,
      batchId: exam.batchId || batchId,
      answers,
      autoMarks,
    });

    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    }
  };

  const hasQuestions = exam.questions && exam.questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-ink-900/5 my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-600 ring-1 ring-success-200">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-error-50 text-error-700 ring-1 ring-error-200 animate-pulse">
                  LIVE ASSESSMENT
                </span>
                <span className="text-xs text-ink-500">{exam.courseTitle || 'Course'} • {exam.maxMarks} Marks</span>
              </div>
              <h2 className="text-lg font-bold text-ink-900">{exam.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border ${
              timeLeftSeconds < 300 ? 'bg-error-50 text-error-700 border-error-200 animate-pulse' : 'bg-ink-50 text-ink-900 border-ink-200'
            }`}>
              <Clock className="h-4 w-4" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600 ring-4 ring-success-100">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-ink-900">Exam Submitted Successfully!</h3>
            <p className="text-sm text-ink-600 max-w-md mx-auto">
              Your response for <span className="font-semibold text-ink-900">{exam.title}</span> has been saved and sent to your faculty for evaluation.
            </p>
            <div className="pt-4">
              <Button variant="primary" onClick={onClose}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
            {/* Instructions */}
            {exam.instructions && (
              <div className="rounded-xl bg-ink-50/70 p-3.5 border border-ink-100 text-xs text-ink-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-900 block mb-0.5">Instructions:</span>
                  <p className="whitespace-pre-line text-ink-600">{exam.instructions}</p>
                </div>
              </div>
            )}

            {/* Document attachment if question mode was upload */}
            {exam.attachmentName && (
              <div className="flex items-center justify-between rounded-xl bg-primary-50/50 p-4 border border-primary-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary-600" />
                  <div>
                    <h4 className="text-xs font-bold text-ink-900">Question Paper File Attached</h4>
                    <p className="text-xs text-ink-500">{exam.attachmentName}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" icon={Download}>
                  Download Question Paper
                </Button>
              </div>
            )}

            {/* Questions List */}
            {hasQuestions ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">Exam Questions</h3>
                {exam.questions!.map((q, idx) => (
                  <div key={q.id} className="rounded-xl bg-white p-4 border border-ink-200 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold text-ink-900">
                        Q{idx + 1}. {q.questionText}
                      </h4>
                      <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                        {q.marks || 5} Marks
                      </span>
                    </div>

                    {q.optionA ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {[
                          { key: 'A', text: q.optionA },
                          { key: 'B', text: q.optionB },
                          { key: 'C', text: q.optionC },
                          { key: 'D', text: q.optionD },
                        ].filter(opt => Boolean(opt.text)).map((opt) => (
                          <label
                            key={opt.key}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              answers[q.id] === opt.key
                                ? 'border-primary-500 bg-primary-50/60 font-semibold text-primary-900 ring-1 ring-primary-300'
                                : 'border-ink-200 bg-white hover:bg-ink-50/50 text-ink-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={opt.key}
                              checked={answers[q.id] === opt.key}
                              onChange={() => handleOptionChange(q.id, opt.key)}
                              className="text-primary-600"
                            />
                            <span><strong className="text-ink-900">{opt.key}.</strong> {opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full rounded-xl border border-ink-200 p-2.5 text-xs text-ink-900 focus:border-primary-500 focus:outline-hidden"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">Answer Submission Response</h3>
                <textarea
                  rows={6}
                  placeholder="Enter your detailed answers, solution explanations, or submission notes here..."
                  value={answers['main_response'] || ''}
                  onChange={(e) => setAnswers({ ...answers, main_response: e.target.value })}
                  className="w-full rounded-xl border border-ink-200 p-3 text-xs text-ink-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!submitted && (
          <div className="flex items-center justify-between border-t border-ink-100 pt-4 mt-6">
            <span className="text-xs text-ink-500 font-medium">
              Questions Answered: {Object.keys(answers).length} / {hasQuestions ? exam.questions!.length : 1}
            </span>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
                icon={Send}
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
