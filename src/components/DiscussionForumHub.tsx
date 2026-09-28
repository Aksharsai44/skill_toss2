import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, HelpCircle, CheckCircle2, Bookmark, User, Filter, ShieldAlert,
  BarChart2, Tag, X, RefreshCw, RotateCcw, AlertCircle, MessageSquare, BookOpen, Layers, Check, Edit3
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/cn';
import type { CommunityPost } from '@/lib/types';
import { DiscussionCard } from '@/components/community/DiscussionCard';
import { AskQuestionModal } from '@/components/community/AskQuestionModal';
import { UserProfileModal } from '@/components/community/UserProfileModal';
import { ReportModal } from '@/components/community/ReportModal';

interface DiscussionForumHubProps {
  currentUserRole: 'teacher' | 'student' | 'admin';
}

type MainTab = 'feed' | 'admin_moderation' | 'admin_analytics';
type StatusFilter = 'all' | 'my_questions' | 'unanswered' | 'answered' | 'solved' | 'saved';
type SortOption = 'latest' | 'upvoted' | 'answered' | 'recent_activity';

const FORUM_SUBJECTS = [
  'All Subjects',
  'Data Structures',
  'Algorithms',
  'Python',
  'Java',
  'Web Development',
  'Database',
  'AI / Machine Learning',
  'Data Science',
  'Projects',
  'Placements',
  'Other'
];

export function DiscussionForumHub({ currentUserRole }: DiscussionForumHubProps) {
  const { state, adminModerateReport, setFeedback } = useLmsData();
  const { user, profile } = useAuth();

  // Active User Info
  const currentUserId = user?.id || profile?.id || 'guest';
  const userRole = profile?.role || currentUserRole;
  const isAdminUser = userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('feed');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('All Subjects');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals state
  const [showAskModal, setShowAskModal] = useState(false);
  const [askModalInitialType, setAskModalInitialType] = useState<'question' | 'discussion'>('question');

  const [selectedUserProfile, setSelectedUserProfile] = useState<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  } | null>(null);

  const [selectedReportTarget, setSelectedReportTarget] = useState<{
    targetType: 'post' | 'answer';
    targetId: string;
    postId: string;
  } | null>(null);

  // Real-Time Event Listener for Forum Posts & Answers
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('skilltoss_community_channel');
      bc.onmessage = (event) => {
        if (!event.data) return;
        if (event.data.type === 'NEW_COMMUNITY_POST') {
          setFeedback({ kind: 'info', message: `New forum question: "${event.data.payload.title}"` });
        } else if (event.data.type === 'NEW_COMMUNITY_ANSWER') {
          setFeedback({ kind: 'info', message: `New answer posted on a forum topic!` });
        }
      };
    } catch {}

    return () => {
      if (bc) bc.close();
    };
  }, [setFeedback]);

  // Filter posts based on Batch / LMS Access rules
  const accessiblePosts = useMemo(() => {
    const all = state.communityPosts || [];
    if (isAdminUser) return all;

    if (currentUserRole === 'student') {
      const studentObj = state.students.find(
        (s) => s.id === currentUserId || (user?.email && s.email.toLowerCase() === user.email.toLowerCase())
      );
      const studentBatchId = studentObj?.batchId;
      return all.filter((p) => !p.isHidden && (!p.batchId || !studentBatchId || p.batchId === studentBatchId));
    }

    if (currentUserRole === 'teacher') {
      const teacherObj = state.teachers.find(
        (t) => t.id === currentUserId || (user?.email && t.email.toLowerCase() === user.email.toLowerCase())
      );
      const teacherBatches = teacherObj?.batchIds || state.batches.map((b) => b.id);
      return all.filter((p) => !p.isHidden && (!p.batchId || teacherBatches.includes(p.batchId)));
    }

    return all;
  }, [state.communityPosts, isAdminUser, currentUserRole, currentUserId, user?.email, state.students, state.teachers, state.batches]);

  // Filter & Search Logic
  const filteredPosts = useMemo(() => {
    let posts = [...accessiblePosts];

    // 1. Course Filter
    if (selectedCourseId !== 'all') {
      const selectedCourse = state.courses.find((c) => c.id === selectedCourseId);
      const courseTitle = selectedCourse?.title.toLowerCase() || '';
      posts = posts.filter((p) =>
        p.departmentId === selectedCourseId ||
        p.category.toLowerCase().includes(courseTitle) ||
        p.title.toLowerCase().includes(courseTitle)
      );
    }

    // 2. Batch Filter
    if (selectedBatchId !== 'all') {
      posts = posts.filter((p) => !p.batchId || p.batchId === selectedBatchId);
    }

    // 3. Subject Filter
    if (selectedSubject !== 'All Subjects') {
      posts = posts.filter((p) => p.category.toLowerCase() === selectedSubject.toLowerCase());
    }

    // 4. Search Filter across Title, Description/Content, Tags, Course, Subject, Author Name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      posts = posts.filter((p) => {
        const courseObj = state.courses.find((c) => c.id === p.departmentId);
        const courseMatch = courseObj ? courseObj.title.toLowerCase().includes(q) : false;
        const titleMatch = p.title.toLowerCase().includes(q);
        const contentMatch = p.content.toLowerCase().includes(q);
        const authorMatch = p.authorName.toLowerCase().includes(q);
        const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        const catMatch = p.category.toLowerCase().includes(q);
        return titleMatch || contentMatch || authorMatch || tagMatch || catMatch || courseMatch;
      });
    }

    // 5. Tag Filter if active
    if (selectedTag) {
      const tagQuery = selectedTag.replace('#', '').toLowerCase();
      posts = posts.filter((p) => (p.tags || []).some((t) => t.toLowerCase().includes(tagQuery)));
    }

    // 6. Status Filter
    if (statusFilter === 'my_questions') {
      posts = posts.filter((p) => p.authorId === currentUserId);
    } else if (statusFilter === 'unanswered') {
      posts = posts.filter((p) => (p.answersCount || 0) === 0);
    } else if (statusFilter === 'answered') {
      posts = posts.filter((p) => (p.answersCount || 0) > 0);
    } else if (statusFilter === 'solved') {
      posts = posts.filter((p) => p.isSolved);
    } else if (statusFilter === 'saved') {
      const bookmarkedIds = (state.communityBookmarks || []).filter((b) => b.userId === currentUserId).map((b) => b.postId);
      posts = posts.filter((p) => bookmarkedIds.includes(p.id));
    }

    // 7. Sort Option
    if (sortOption === 'upvoted') {
      posts.sort((a, b) => (b.upvotesCount || 0) - (a.upvotesCount || 0));
    } else if (sortOption === 'answered') {
      posts.sort((a, b) => (b.answersCount || 0) - (a.answersCount || 0));
    } else if (sortOption === 'recent_activity') {
      posts.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    } else {
      // 'latest': Pinned first, then newest
      posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return posts;
  }, [accessiblePosts, selectedCourseId, selectedBatchId, selectedSubject, searchQuery, selectedTag, statusFilter, sortOption, currentUserId, state.communityBookmarks, state.courses]);

  // Check if any filter is active for Clear Filters button
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCourseId !== 'all' ||
      selectedBatchId !== 'all' ||
      selectedSubject !== 'All Subjects' ||
      statusFilter !== 'all' ||
      sortOption !== 'latest' ||
      Boolean(selectedTag) ||
      searchQuery.trim() !== ''
    );
  }, [selectedCourseId, selectedBatchId, selectedSubject, statusFilter, sortOption, selectedTag, searchQuery]);

  const handleClearFilters = () => {
    setSelectedCourseId('all');
    setSelectedBatchId('all');
    setSelectedSubject('All Subjects');
    setStatusFilter('all');
    setSortOption('latest');
    setSelectedTag(null);
    setSearchQuery('');
  };

  const adminStats = useMemo(() => {
    const posts = state.communityPosts || [];
    return {
      totalPosts: posts.length,
      solvedQuestions: posts.filter((p) => p.isSolved).length,
      unansweredQuestions: posts.filter((p) => (p.answersCount || 0) === 0).length,
      totalAnswers: (state.communityAnswers || []).length,
    };
  }, [state.communityPosts, state.communityAnswers]);

  const pendingReports = useMemo(() => {
    return (state.communityReports || []).filter((r) => r.status === 'pending');
  }, [state.communityReports]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Discussion Forum"
        subtitle="Ask questions, share knowledge and learn together."
      />

      {/* ADMIN CONTROL TABS IF ADMIN */}
      {isAdminUser && (
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('feed')}
            className={cn('pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'feed' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800')}
          >
            <HelpCircle className="w-4 h-4" /> Forum Feed
          </button>
          <button
            onClick={() => setActiveTab('admin_moderation')}
            className={cn('pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'admin_moderation' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800')}
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Moderation Panel ({pendingReports.length})
          </button>
          <button
            onClick={() => setActiveTab('admin_analytics')}
            className={cn('pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'admin_analytics' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800')}
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" /> Forum Analytics
          </button>
        </div>
      )}

      {/* MAIN FORUM FEED VIEW */}
      {activeTab === 'feed' && (
        <div className="space-y-5 w-full">
          {/* 1. LARGE PROMINENT QUORA-INSPIRED ASK / SHARE COMPOSER CARD */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-3.5">
            <div className="flex items-center gap-3">
              <img
                src={(profile as any)?.avatar || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.fullName || user?.email || 'User')}`}
                alt={profile?.fullName || 'User'}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
              />
              <button
                onClick={() => {
                  setAskModalInitialType('question');
                  setShowAskModal(true);
                }}
                className="flex-1 text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs sm:text-sm font-medium hover:bg-slate-100 hover:border-slate-300 transition-all shadow-inner"
              >
                What do you want to ask or share?
              </button>
            </div>
            <div className="flex items-center justify-around pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
              <button
                onClick={() => {
                  setAskModalInitialType('question');
                  setShowAskModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
              >
                <HelpCircle className="w-4 h-4 text-indigo-600" /> Ask Question
              </button>
              <button
                onClick={() => setStatusFilter('unanswered')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition"
              >
                <Edit3 className="w-4 h-4 text-emerald-600" /> Answer Questions
              </button>
              <button
                onClick={() => {
                  setAskModalInitialType('discussion');
                  setShowAskModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition"
              >
                <Plus className="w-4 h-4 text-purple-600" /> Start Discussion
              </button>
            </div>
          </Card>

          {/* 2. LARGE SEARCH BAR */}
          <div className="relative w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions, topics, code snippets, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 3. ACADEMIC FILTERS (COURSE, BATCH, SUBJECT, STATUS, SORT BY) */}
          <Card className="p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Academic Filters
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {/* Course Filter */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1 uppercase tracking-wide">
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="all">All Courses</option>
                  {state.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Batch Filter */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1 uppercase tracking-wide">
                  Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="all">All Batches</option>
                  {state.batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1 uppercase tracking-wide">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  {FORUM_SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1 uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="all">All Discussions</option>
                  <option value="my_questions">My Questions</option>
                  <option value="unanswered">Unanswered</option>
                  <option value="answered">Answered</option>
                  <option value="solved">Solved</option>
                  <option value="saved">Saved</option>
                </select>
              </div>

              {/* Sort Option */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1 uppercase tracking-wide">
                  Sort By
                </label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="latest">Latest</option>
                  <option value="upvoted">Most Upvoted</option>
                  <option value="answered">Most Answered</option>
                  <option value="recent_activity">Recently Active</option>
                </select>
              </div>
            </div>
          </Card>



          {/* ACTIVE TAG INDICATOR IF CLICKED */}
          {selectedTag && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
              <span className="font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" /> Filtered by Tag: <span className="underline">{selectedTag}</span>
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2.5 py-1 rounded-md bg-white text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-100 text-xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Tag
              </button>
            </div>
          )}

          {/* 5. LARGE FULL-WIDTH DISCUSSION FEED */}
          <div className="space-y-4 w-full">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <DiscussionCard
                  key={post.id}
                  post={post}
                  answers={(state.communityAnswers || []).filter((a) => a.postId === post.id)}
                  onOpenProfile={(id, name, role, avatar) => setSelectedUserProfile({ id, name, role, avatar })}
                  onOpenReport={(targetType, targetId, postId) => setSelectedReportTarget({ targetType, targetId, postId })}
                />
              ))
            ) : (
              /* EMPTY STATES */
              <Card className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl space-y-4">
                <HelpCircle className="w-14 h-14 text-indigo-300 mx-auto" />
                {hasActiveFilters ? (
                  <>
                    <h3 className="text-base font-bold text-slate-800">No discussions found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try changing your search keywords or clearing your active filters.
                    </p>
                    <button
                      onClick={handleClearFilters}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-slate-800">No discussions yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Start a discussion or ask a question to begin learning with your classmates and teachers.
                    </p>
                    <button
                      onClick={() => {
                        setAskModalInitialType('question');
                        setShowAskModal(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Ask Question
                    </button>
                  </>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ADMIN MODERATION PANEL TAB */}
      {activeTab === 'admin_moderation' && isAdminUser && (
        <div className="space-y-4 w-full">
          <Card className="p-5 space-y-4 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Forum Content Moderation Panel</h3>
                <p className="text-xs text-slate-500 mt-0.5">Review reported questions, answers, and inappropriate content.</p>
              </div>
              <Badge variant="warning">{pendingReports.length} Pending Reports</Badge>
            </div>

            {pendingReports.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-3">Reporter</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{rep.reporterName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 uppercase">
                            {rep.targetType}
                          </span>
                        </td>
                        <td className="p-3 text-amber-700 font-medium">{rep.reason}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{rep.details || 'No additional details provided'}</td>
                        <td className="p-3 text-slate-400">{new Date(rep.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => adminModerateReport(rep.id, 'dismiss')}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => adminModerateReport(rep.id, 'hide')}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200"
                            >
                              Hide
                            </button>
                            <button
                              onClick={() => adminModerateReport(rep.id, 'delete')}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <ShieldAlert className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No pending content reports</p>
                <p className="text-[11px] text-slate-400">All forum posts comply with community guidelines.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ADMIN ANALYTICS PANEL TAB */}
      {activeTab === 'admin_analytics' && isAdminUser && (
        <div className="space-y-5 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Questions</span>
              <p className="text-2xl font-black text-slate-900">{adminStats.totalPosts}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Solved Questions</span>
              <p className="text-2xl font-black text-emerald-600">{adminStats.solvedQuestions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unanswered</span>
              <p className="text-2xl font-black text-amber-600">{adminStats.unansweredQuestions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Answers</span>
              <p className="text-2xl font-black text-indigo-600">{adminStats.totalAnswers}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AskQuestionModal open={showAskModal} onClose={() => setShowAskModal(false)} initialPostType={askModalInitialType} />
      <UserProfileModal user={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />
      <ReportModal target={selectedReportTarget} onClose={() => setSelectedReportTarget(null)} />
    </div>
  );
}
