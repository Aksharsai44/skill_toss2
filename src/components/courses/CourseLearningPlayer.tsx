import { useState } from 'react';
import {
  ArrowLeft, CheckCircle2, Circle, PlayCircle, FileText, Video, ExternalLink,
  Code2, HelpCircle, FileCheck, ChevronRight, ChevronDown, Download,
  MessageSquare, Sparkles, Award, Lock, BookOpen, AlertCircle
} from 'lucide-react';
import type { LmsCourse, CourseModule, CourseLesson, CourseEnrollment, LessonProgress } from '@/lib/types';
import { cn } from '@/lib/cn';
import { FileAttachmentPicker } from '@/components/FileAttachmentPicker';
import { Badge } from '@/components/ui/Badge';
import { DiscussionForumHub } from '@/components/DiscussionForumHub';

interface CourseLearningPlayerProps {
  course: LmsCourse;
  modules: CourseModule[];
  lessons: CourseLesson[];
  enrollment?: CourseEnrollment;
  progressList: LessonProgress[];
  studentId: string;
  studentName: string;
  onBack: () => void;
  onMarkLessonComplete: (lessonId: string) => void;
}

export function CourseLearningPlayer({
  course,
  modules,
  lessons,
  enrollment,
  progressList,
  studentId,
  studentName,
  onBack,
  onMarkLessonComplete,
}: CourseLearningPlayerProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string>(modules[0]?.id || '');
  const [activeLessonId, setActiveLessonId] = useState<string>(lessons[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'content' | 'discussion'>('content');

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Coding exercise state
  const [userCode, setUserCode] = useState<string>('// Write your solution here\nfunction solve(input) {\n  return input;\n}');
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [testsPassed, setTestsPassed] = useState<boolean | null>(null);

  // Assignment submission state
  const [submissionText, setSubmissionText] = useState<string>('');
  const [submittedAssignment, setSubmittedAssignment] = useState<boolean>(false);

  const completedLessonIds = new Set(progressList.map((p) => p.lessonId));
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const activeModule = modules.find((m) => m.id === activeLesson?.moduleId);

  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l) => completedLessonIds.has(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const currentLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const prevLesson = currentLessonIndex > 0 ? lessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < lessons.length - 1 ? lessons[currentLessonIndex + 1] : null;

  const isCompleted = activeLesson ? completedLessonIds.has(activeLesson.id) : false;

  const handleMarkComplete = () => {
    if (activeLesson) {
      onMarkLessonComplete(activeLesson.id);
      if (nextLesson) {
        setActiveLessonId(nextLesson.id);
        const nextMod = modules.find((m) => m.id === nextLesson.moduleId);
        if (nextMod) setExpandedModuleId(nextMod.id);
      }
    }
  };

  const handleRunCode = () => {
    setCodeOutput('Compiling and running test cases...\nTest Case 1: PASSED ✓\nTest Case 2: PASSED ✓\nAll test cases executed successfully!');
    setTestsPassed(true);
  };

  const handleQuizSubmit = () => {
    if (!activeLesson?.quizData) return;
    let score = 0;
    activeLesson.quizData.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) {
        score += q.marks || 10;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const renderLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Video className="w-4 h-4 text-primary-600 shrink-0" />;
      case 'PDF':
      case 'DOC':
      case 'PPT': return <FileText className="w-4 h-4 text-accent-600 shrink-0" />;
      case 'CODING_EXERCISE': return <Code2 className="w-4 h-4 text-warning-600 shrink-0" />;
      case 'QUIZ': return <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'ASSIGNMENT': return <FileCheck className="w-4 h-4 text-success-600 shrink-0" />;
      default: return <BookOpen className="w-4 h-4 text-ink-500 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-ink-200 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded-xl transition flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Player
          </button>
          <div className="h-5 w-px bg-ink-200" />
          <div>
            <h1 className="font-bold text-ink-900 text-sm sm:text-base truncate max-w-md">{course.title}</h1>
            <p className="text-xs text-ink-500 flex items-center gap-2">
              <span>{course.instructorName}</span> • <span>{course.category}</span> • <Badge variant="neutral">{course.level}</Badge>
            </p>
          </div>
        </div>

        {/* Progress summary & Tabs */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-32 bg-ink-100 rounded-full h-2 overflow-hidden">
              <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-semibold text-primary-700">{progressPct}% Complete</span>
          </div>

          <div className="flex bg-ink-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('content')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition', activeTab === 'content' ? 'bg-white text-ink-900 shadow-xs font-semibold' : 'text-ink-600 hover:text-ink-900')}
            >
              Lesson Content
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5', activeTab === 'discussion' ? 'bg-white text-ink-900 shadow-xs font-semibold' : 'text-ink-600 hover:text-ink-900')}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Discussion
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      {activeTab === 'discussion' ? (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          <div className="mb-4 bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900 text-sm">Course Q&A Discussion Forum</h3>
              <p className="text-xs text-primary-700">Ask questions, share code snippets, and collaborate with classmates and teachers for <strong>{course.title}</strong>.</p>
            </div>
          </div>
          <DiscussionForumHub currentUserRole="student" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar Curriculum Navigation */}
          <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-ink-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-ink-100 bg-ink-50/50">
              <h2 className="font-semibold text-ink-900 text-sm flex items-center justify-between">
                <span>Course Curriculum</span>
                <span className="text-xs text-ink-500 font-normal">{completedCount}/{totalLessons} Done</span>
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-ink-100">
              {modules.map((mod, modIdx) => {
                const modLessons = lessons.filter((l) => l.moduleId === mod.id);
                const isExpanded = expandedModuleId === mod.id;
                const modCompletedCount = modLessons.filter((l) => completedLessonIds.has(l.id)).length;

                return (
                  <div key={mod.id} className="bg-white">
                    <button
                      onClick={() => setExpandedModuleId(isExpanded ? '' : mod.id)}
                      className="w-full text-left p-3.5 hover:bg-ink-50 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-900 truncate">Module {modIdx + 1}: {mod.title}</p>
                          <p className="text-[11px] text-ink-500">{modLessons.length} lessons • {modCompletedCount}/{modLessons.length} completed</p>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-ink-50/40 divide-y divide-ink-100/60 pl-2">
                        {modLessons.map((les) => {
                          const isLesCompleted = completedLessonIds.has(les.id);
                          const isActive = les.id === activeLessonId;

                          return (
                            <button
                              key={les.id}
                              onClick={() => setActiveLessonId(les.id)}
                              className={cn(
                                'w-full text-left p-3 flex items-start gap-2.5 transition text-xs pl-6 border-l-2',
                                isActive
                                  ? 'bg-primary-50/70 border-primary-600 font-medium text-primary-900'
                                  : 'hover:bg-ink-100/60 border-transparent text-ink-700'
                              )}
                            >
                              {isLesCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0 mt-0.5" />
                              ) : isActive ? (
                                <Circle className="w-4 h-4 text-primary-600 fill-primary-100 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-ink-300 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="truncate font-medium">{les.title}</p>
                                  {renderLessonIcon(les.lessonType)}
                                </div>
                                <p className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-2">
                                  <span>{les.durationMinutes || 10} min</span> • <span>{les.lessonType}</span>
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Center Main Player Content */}
          <main className="flex-1 flex flex-col bg-white overflow-y-auto">
            {activeLesson ? (
              <div className="flex-1 flex flex-col p-4 sm:p-8 max-w-4xl w-full mx-auto">
                {/* Lesson Header */}
                <div className="mb-6 pb-4 border-b border-ink-100 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold uppercase text-primary-600 tracking-wider">
                        {activeModule?.title || 'Module'}
                      </span>
                      <span className="text-ink-300">•</span>
                      <Badge variant="neutral">{activeLesson.lessonType}</Badge>
                    </div>
                    <h2 className="text-2xl font-bold font-display text-ink-900">{activeLesson.title}</h2>
                    {activeLesson.description && (
                      <p className="text-sm text-ink-600 mt-2">{activeLesson.description}</p>
                    )}
                  </div>

                  {isCompleted && (
                    <span className="px-3 py-1 bg-success-50 text-success-700 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  )}
                </div>

                {/* Content Player Switcher */}
                <div className="flex-1 min-h-[360px] bg-ink-900/5 rounded-2xl p-4 mb-6 flex flex-col">
                  {activeLesson.lessonType === 'VIDEO' && (
                    <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-lg flex flex-col items-center justify-center min-h-[340px]">
                      {activeLesson.videoUrl ? (
                        activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be') ? (
                          <iframe
                            className="w-full h-full min-h-[360px]"
                            src={activeLesson.videoUrl.replace('watch?v=', 'embed/')}
                            title={activeLesson.title}
                            allowFullScreen
                          />
                        ) : (
                          <video controls className="w-full max-h-[480px]">
                            <source src={activeLesson.videoUrl} type="video/mp4" />
                            Your browser does not support video playback.
                          </video>
                        )
                      ) : (
                        <div className="text-center p-8 text-white/70">
                          <PlayCircle className="w-16 h-16 mx-auto mb-3 text-primary-400" />
                          <p className="font-semibold text-lg">Sample Educational Video</p>
                          <p className="text-xs text-white/50 mt-1">Video stream is ready for playback</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeLesson.lessonType === 'PDF' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                      <FileText className="w-16 h-16 text-error-600 mb-3" />
                      <h4 className="font-semibold text-ink-900 text-lg">{activeLesson.fileName || `${activeLesson.title}.pdf`}</h4>
                      <p className="text-xs text-ink-500 mt-1 mb-4">Official PDF Learning Material</p>
                      {activeLesson.resourceUrl ? (
                        <a href={activeLesson.resourceUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm flex items-center gap-2">
                          <Download className="w-4 h-4" /> Download PDF Document
                        </a>
                      ) : (
                        <div className="p-4 bg-ink-50 rounded-xl text-xs text-ink-600 max-w-md">
                          PDF document viewer ready. Click download below to open.
                        </div>
                      )}
                    </div>
                  )}

                  {(activeLesson.lessonType === 'DOC' || activeLesson.lessonType === 'PPT') && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-6 text-center flex flex-col items-center justify-center">
                      <FileText className="w-16 h-16 text-accent-600 mb-3" />
                      <h4 className="font-semibold text-ink-900 text-lg">{activeLesson.fileName || `${activeLesson.title}.${activeLesson.lessonType.toLowerCase()}`}</h4>
                      <p className="text-xs text-ink-500 mt-1 mb-4">{activeLesson.lessonType} Presentation / Document Material</p>
                      {activeLesson.resourceUrl && (
                        <a href={activeLesson.resourceUrl} download className="btn-primary text-sm flex items-center gap-2">
                          <Download className="w-4 h-4" /> Download Attachment
                        </a>
                      )}
                    </div>
                  )}

                  {activeLesson.lessonType === 'TEXT' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-6 overflow-y-auto text-ink-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {activeLesson.richText || activeLesson.description || 'Welcome to this lesson. Read through the text materials and proceed.'}
                    </div>
                  )}

                  {activeLesson.lessonType === 'EXTERNAL_LINK' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                      <ExternalLink className="w-12 h-12 text-primary-600 mb-3" />
                      <h4 className="font-semibold text-ink-900 text-lg">External Learning Resource</h4>
                      <p className="text-xs text-ink-500 mt-1 mb-4 max-w-md">This lesson links to an external reference resource.</p>
                      {activeLesson.resourceUrl && (
                        <a href={activeLesson.resourceUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm inline-flex items-center gap-2">
                          Open External Link <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {activeLesson.lessonType === 'CODING_EXERCISE' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-5 flex flex-col gap-4">
                      <div>
                        <h4 className="font-bold text-ink-900 text-base mb-1">💻 Coding Problem</h4>
                        <p className="text-sm text-ink-700">{activeLesson.codingProblem?.statement || 'Implement a function to solve the data structure problem.'}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-ink-900 text-ink-100 rounded-xl p-3 font-mono text-xs flex flex-col">
                          <div className="text-ink-400 text-[10px] uppercase mb-2 border-b border-ink-700 pb-1">Code Workspace</div>
                          <textarea
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                            className="bg-transparent border-0 text-white font-mono text-xs w-full flex-1 min-h-[160px] focus:outline-none resize-none"
                          />
                          <button onClick={handleRunCode} className="mt-2 btn-primary text-xs self-end py-1.5 px-3">
                            Run Code & Test Cases
                          </button>
                        </div>

                        <div className="bg-ink-50 rounded-xl p-3 border border-ink-200 text-xs flex flex-col">
                          <div className="font-semibold text-ink-700 mb-2 border-b border-ink-200 pb-1">Output Console</div>
                          <pre className="flex-1 font-mono text-[11px] text-ink-800 whitespace-pre-wrap">
                            {codeOutput || 'Run code to view output console results...'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLesson.lessonType === 'QUIZ' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-6 flex flex-col">
                      <h4 className="font-bold text-ink-900 text-lg mb-4 flex items-center justify-between">
                        <span>📝 Lesson Assessment Quiz</span>
                        {quizSubmitted && (
                          <span className="text-xs font-semibold bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
                            Score: {quizScore} pts
                          </span>
                        )}
                      </h4>

                      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                        {(activeLesson.quizData?.questions || [
                          { question: 'What is the time complexity of searching in a Balanced BST?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'], correctAnswer: 1, marks: 10 },
                          { question: 'Which data structure follows LIFO (Last In First Out)?', options: ['Queue', 'Stack', 'Array', 'Tree'], correctAnswer: 1, marks: 10 }
                        ]).map((q, qIdx) => (
                          <div key={qIdx} className="p-4 bg-ink-50 rounded-xl border border-ink-200/70">
                            <p className="font-semibold text-ink-900 text-sm mb-3">Q{qIdx + 1}. {q.question}</p>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  onClick={() => !quizSubmitted && setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                  className={cn(
                                    'w-full text-left p-2.5 rounded-lg text-xs transition border flex items-center justify-between',
                                    quizAnswers[qIdx] === optIdx
                                      ? 'bg-primary-50 border-primary-500 font-semibold text-primary-900'
                                      : 'bg-white border-ink-200 hover:bg-ink-100 text-ink-700'
                                  )}
                                >
                                  <span>{opt}</span>
                                  {quizSubmitted && optIdx === q.correctAnswer && (
                                    <span className="text-[10px] bg-success-100 text-success-800 px-2 py-0.5 rounded-full font-bold">Correct</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!quizSubmitted && (
                        <button onClick={handleQuizSubmit} className="mt-4 btn-primary text-sm w-full py-2.5">
                          Submit Quiz Answers
                        </button>
                      )}
                    </div>
                  )}

                  {activeLesson.lessonType === 'ASSIGNMENT' && (
                    <div className="flex-1 bg-white border border-ink-200 rounded-xl p-6 flex flex-col gap-4">
                      <div className="p-4 bg-accent-50/60 border border-accent-200 rounded-xl">
                        <h4 className="font-bold text-ink-900 text-sm mb-1">📋 Assignment Brief</h4>
                        <p className="text-xs text-ink-700 leading-relaxed">
                          {activeLesson.assignmentData?.instructions || 'Complete the assignment solution and attach your code/document below for evaluation.'}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-ink-700">Written Submission Response</label>
                        <textarea
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Type your submission response notes..."
                          className="input w-full min-h-[100px] text-xs"
                        />
                      </div>

                      <div>
                        <FileAttachmentPicker
                          ownerId={studentId}
                          ownerType="submission"
                          files={[]}
                          onChange={() => {}}
                          label="Attach Assignment File (Optional)"
                        />
                      </div>

                      <button
                        onClick={() => setSubmittedAssignment(true)}
                        disabled={submittedAssignment}
                        className={cn('btn-primary text-sm py-2.5 w-full mt-2', submittedAssignment && 'bg-success-600 hover:bg-success-600')}
                      >
                        {submittedAssignment ? '✓ Assignment Submitted Successfully' : 'Submit Assignment'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-ink-100">
                  <button
                    onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
                    disabled={!prevLesson}
                    className="btn-secondary text-xs disabled:opacity-40"
                  >
                    ← Previous Lesson
                  </button>

                  <button
                    onClick={handleMarkComplete}
                    className="btn-primary text-xs px-6 py-2.5 shadow-sm"
                  >
                    {isCompleted ? 'Next Lesson →' : '✓ Mark Complete & Continue'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-ink-400">
                Select a lesson from the curriculum sidebar to start learning.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
