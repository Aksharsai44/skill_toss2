import { useState } from 'react';
import {
  Sparkles, Check, RefreshCw, Edit3, Save, Copy, FileText, HelpCircle,
  Brain, Layers, Lightbulb
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

interface AiCourseAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextTitle: string;
  contextText: string;
  onAcceptAiContent: (generated: {
    summary: string;
    objectives: string[];
    keyConcepts: string[];
    quizQuestions: { question: string; options: string[]; correctAnswer: number; marks: number }[];
    flashcards: { front: string; back: string }[];
  }) => void;
}

export function AiCourseAssistantModal({
  isOpen,
  onClose,
  contextTitle,
  contextText,
  onAcceptAiContent,
}: AiCourseAssistantModalProps) {
  const [generating, setGenerating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Generated content state
  const [summary, setSummary] = useState<string>(
    `This lesson provides a comprehensive overview of ${contextTitle || 'the course topic'}. Students will learn fundamental concepts, practical application patterns, and industry best practices.`
  );
  const [objectives, setObjectives] = useState<string[]>([
    `Understand core principles of ${contextTitle || 'the domain'}`,
    `Implement practical solutions using industry standard techniques`,
    `Analyze efficiency and resolve common performance bottlenecks`
  ]);
  const [keyConcepts, setKeyConcepts] = useState<string[]>([
    'Fundamental Data Schema',
    'Algorithmic Efficiency',
    'Edge Case Handling'
  ]);
  const [quizQuestions, setQuizQuestions] = useState<
    { question: string; options: string[]; correctAnswer: number; marks: number }[]
  >([
    {
      question: `What is the primary objective when studying ${contextTitle || 'this topic'}?`,
      options: ['Optimizing execution speed', 'Reducing memory overhead', 'Improving code clarity', 'All of the above'],
      correctAnswer: 3,
      marks: 10,
    },
    {
      question: `Which data structure provides constant O(1) lookup time on average?`,
      options: ['Array', 'Hash Table / Dictionary', 'Binary Search Tree', 'Linked List'],
      correctAnswer: 1,
      marks: 10,
    }
  ]);
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([
    { front: `What is ${contextTitle || 'Concept 1'}?`, back: 'A foundational technique for structured data processing.' },
    { front: 'What is Time Complexity?', back: 'A mathematical measure of how execution time grows with input size.' }
  ]);

  const handleRegenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setSummary(
        `AI Analysis: "${contextTitle || 'Lesson'}" covers advanced algorithmic structures, trade-off analysis, and real-world software design patterns.`
      );
      setObjectives([
        `Master foundational syntax and internal mechanics of ${contextTitle || 'this module'}`,
        `Apply design patterns to solve real-world engineering problems`,
        `Evaluate time and space complexity trade-offs effectively`
      ]);
      setKeyConcepts(['State Preservation', 'Recursive Execution', 'Memory Optimization']);
      setGenerating(false);
    }, 600);
  };

  const handleAccept = () => {
    onAcceptAiContent({
      summary,
      objectives,
      keyConcepts,
      quizQuestions,
      flashcards,
    });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="✨ Skill Toss AI Course Content Assistant"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header alert */}
        <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl border border-primary-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <div className="text-xs text-ink-700">
            <p className="font-semibold text-primary-900">AI Assistance Generated Preview</p>
            <p className="mt-0.5">
              Review and edit AI-generated summary, learning objectives, quiz questions, and flashcards before accepting. AI content requires faculty approval.
            </p>
          </div>
        </div>

        {generating ? (
          <div className="py-12 text-center text-ink-500 space-y-3">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
            <p className="text-xs font-medium">Analyzing lesson content & generating quiz questions...</p>
          </div>
        ) : (
          <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1">
            {/* Summary */}
            <div className="p-4 border border-ink-200 rounded-2xl bg-white space-y-2">
              <h4 className="text-xs font-bold uppercase text-ink-700 tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary-600" /> Lesson Summary
              </h4>
              {isEditing ? (
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="input w-full text-xs min-h-[80px]"
                />
              ) : (
                <p className="text-xs text-ink-800 leading-relaxed">{summary}</p>
              )}
            </div>

            {/* Learning Objectives */}
            <div className="p-4 border border-ink-200 rounded-2xl bg-white space-y-2">
              <h4 className="text-xs font-bold uppercase text-ink-700 tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-warning-600" /> AI-Generated Learning Objectives
              </h4>
              <ul className="space-y-1.5 text-xs text-ink-800">
                {objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success-600 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Concepts */}
            <div className="p-4 border border-ink-200 rounded-2xl bg-white space-y-2">
              <h4 className="text-xs font-bold uppercase text-ink-700 tracking-wider flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-accent-600" /> Key Concepts & Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyConcepts.map((kc, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-accent-50 text-accent-800 rounded-lg text-xs font-medium border border-accent-200">
                    {kc}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Generated MCQs */}
            <div className="p-4 border border-ink-200 rounded-2xl bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink-700 tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" /> Generated Quiz MCQs ({quizQuestions.length})
              </h4>
              <div className="space-y-3">
                {quizQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-ink-50 rounded-xl text-xs space-y-2 border border-ink-200/60">
                    <p className="font-semibold text-ink-900">Q{idx + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={cn(
                            'p-1.5 rounded-lg border',
                            optIdx === q.correctAnswer ? 'bg-success-50 border-success-400 font-semibold text-success-900' : 'bg-white border-ink-200 text-ink-600'
                          )}
                        >
                          {optIdx + 1}. {opt} {optIdx === q.correctAnswer && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flashcards */}
            <div className="p-4 border border-ink-200 rounded-2xl bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink-700 tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-success-600" /> Practice Flashcards ({flashcards.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {flashcards.map((fc, idx) => (
                  <div key={idx} className="p-3 bg-primary-50/40 border border-primary-200/80 rounded-xl text-xs">
                    <p className="font-bold text-primary-900 mb-1">Front: {fc.front}</p>
                    <p className="text-primary-800 text-[11px]">Back: {fc.back}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-ink-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Done Editing' : 'Edit AI Content'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>

          <button
            onClick={handleAccept}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" /> Accept & Insert into Course
          </button>
        </div>
      </div>
    </Modal>
  );
}
