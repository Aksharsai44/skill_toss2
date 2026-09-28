import React from 'react';
import { useLmsData } from '@/lib/lmsDataContext';
import { X, Award, CheckCircle2, MessageSquare, HelpCircle, ThumbsUp, GraduationCap, BookOpen, Layers, Star } from 'lucide-react';

interface UserProfileModalProps {
  user: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  } | null;
  onClose: () => void;
}

export function UserProfileModal({ user, onClose }: UserProfileModalProps) {
  const { state } = useLmsData();

  if (!user) return null;

  // Calculate dynamic engagement statistics from actual state
  const userPosts = (state.communityPosts || []).filter((p) => p.authorId === user.id);
  const userAnswers = (state.communityAnswers || []).filter((a) => a.authorId === user.id);
  const bestAnswersCount = userAnswers.filter((a) => a.isBestAnswer).length;
  const totalUpvotesReceived = userAnswers.reduce((acc, a) => acc + (a.upvotesCount || 0), 0) +
    userPosts.reduce((acc, p) => acc + (p.upvotesCount || 0), 0);

  // Contribution score calculation: Question (+2), Answer (+5), Best Answer (+10), Upvote (+2)
  const contributionScore = (userPosts.length * 2) + (userAnswers.length * 5) + (bestAnswersCount * 10) + (totalUpvotesReceived * 2);

  // Match teacher/student specifics from LMS state
  const teacherObj = state.teachers.find((t) => t.id === user.id || t.name === user.name);
  const studentObj = state.students.find((s) => s.id === user.id || s.name === user.name);
  const batchObj = studentObj ? state.batches.find((b) => b.id === studentObj.batchId) : null;
  const teacherCourses = teacherObj ? state.courses.filter((c) => (teacherObj.courseIds || []).includes(c.id)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {/* Cover Banner */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-start justify-between">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white backdrop-blur-xs border border-white/30">
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> {contributionScore} Points
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar overlap */}
          <div className="-mt-12 mb-4 flex items-end justify-between">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md bg-white"
            />
            {user.role === 'teacher' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> ✓ TEACHER
              </span>
            )}
            {user.role === 'student' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                STUDENT
              </span>
            )}
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                ADMINISTRATOR
              </span>
            )}
          </div>

          {/* User Name & Affiliation */}
          <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
          
          {user.role === 'teacher' && (
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Faculty Member • Department of Computer Science
            </p>
          )}

          {user.role === 'student' && (
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Batch: {batchObj?.name || 'CS-2024-A'}
            </p>
          )}

          {/* Assigned Courses for Teachers */}
          {user.role === 'teacher' && teacherCourses.length > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                Courses Taught
              </span>
              <div className="flex flex-wrap gap-1">
                {teacherCourses.map((c) => (
                  <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded bg-white text-blue-900 border border-blue-200">
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community Activity Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Questions
              </div>
              <p className="text-lg font-extrabold text-slate-900">{userPosts.length}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Answers
              </div>
              <p className="text-lg font-extrabold text-slate-900">{userAnswers.length}</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-700 text-xs mb-1">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Best Answers
              </div>
              <p className="text-lg font-extrabold text-amber-950">{bestAnswersCount}</p>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
              <div className="flex items-center justify-center gap-1 text-indigo-700 text-xs mb-1">
                <ThumbsUp className="w-3.5 h-3.5 text-indigo-600" /> Total Upvotes
              </div>
              <p className="text-lg font-extrabold text-indigo-950">{totalUpvotesReceived}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
