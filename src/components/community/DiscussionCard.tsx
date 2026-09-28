import React, { useState } from 'react';
import type { CommunityPost, CommunityAnswer } from '@/lib/types';
import { useAuth } from '@/lib/authContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { 
  ThumbsUp, MessageSquare, Bookmark, Share2, Flag, Pin, CheckCircle2, 
  Award, Sparkles, MoreVertical, Edit3, Trash2, Tag, Eye, ChevronRight,
  ChevronDown, ChevronUp, Bell, Paperclip, Code, Send, CornerDownRight, X, Download
} from 'lucide-react';

interface DiscussionCardProps {
  post: CommunityPost;
  answers: CommunityAnswer[];
  onOpenDetail?: (post: CommunityPost) => void;
  onOpenProfile: (userId: string, userName: string, userRole: string, userAvatar?: string) => void;
  onOpenReport: (targetType: 'post' | 'answer', targetId: string, postId: string) => void;
  onEditPost?: (post: CommunityPost) => void;
}

export function DiscussionCard({
  post,
  answers,
  onOpenDetail,
  onOpenProfile,
  onOpenReport,
  onEditPost,
}: DiscussionCardProps) {
  const { user, profile } = useAuth();
  const { 
    state, 
    addCommunityAnswer, 
    toggleCommunityUpvote, 
    toggleCommunityBookmark, 
    toggleCommunityFollow, 
    deleteCommunityPost, 
    togglePinCommunityPost,
    markBestAnswer, 
    setFeedback 
  } = useLmsData();

  // State
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState(true); // Default to showing inline answers!
  const [showAnswerComposer, setShowAnswerComposer] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [replyToAnswerId, setReplyToAnswerId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Attachments & Code Snippet in Answer Composer
  const [answerAttachmentName, setAnswerAttachmentName] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);

  const userId = user?.id || profile?.id || 'guest';
  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = (profile?.role || 'student') as 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
  const userAvatar = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

  const isAuthor = post.authorId === userId;
  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';
  const canMarkBestAnswer = isAuthor || isTeacherOrAdmin;

  const isUpvotedPost = (state.communityUpvotes || []).some(
    (u) => u.userId === userId && u.targetType === 'post' && u.targetId === post.id
  );
  const isSavedPost = (state.communityBookmarks || []).some(
    (b) => b.userId === userId && b.postId === post.id
  );
  const isFollowingPost = (state.communityFollows || []).some(
    (f) => f.userId === userId && f.postId === post.id
  );

  const postAnswers = answers.filter((a) => a.postId === post.id && !a.isHidden);
  const topLevelAnswers = postAnswers.filter((a) => !a.parentAnswerId);
  const sortedAnswers = [...topLevelAnswers].sort((a, b) => {
    if (a.isBestAnswer) return -1;
    if (b.isBestAnswer) return 1;
    if (a.authorRole === 'teacher' && b.authorRole !== 'teacher') return -1;
    if (b.authorRole !== 'teacher' && a.authorRole === 'teacher') return 1;
    return (b.upvotesCount || 0) - (a.upvotesCount || 0);
  });

  const bestAnswer = postAnswers.find((a) => a.isBestAnswer);

  // Handlers
  const handleUpvotePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCommunityUpvote(userId, 'post', post.id);
  };

  const handleBookmarkPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCommunityBookmark(userId, post.id);
  };

  const handleFollowPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCommunityFollow(userId, post.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?question=${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setFeedback({ kind: 'info', message: 'Discussion link copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeletePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this discussion?')) {
      deleteCommunityPost(post.id);
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinCommunityPost(post.id);
    setShowMenu(false);
  };

  const handlePostAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim()) return;

    let finalContent = answerContent.trim();
    if (answerAttachmentName) {
      finalContent += `\n\n📎 Attachment: ${answerAttachmentName}`;
    }

    const res = addCommunityAnswer({
      postId: post.id,
      authorId: userId,
      authorName: userName,
      authorRole: userRole,
      authorAvatar: userAvatar,
      content: finalContent,
    });

    if (res.ok) {
      setAnswerContent('');
      setAnswerAttachmentName('');
      setShowAnswerComposer(false);
      setExpandedAnswers(true);
    }
  };

  const handlePostReplySubmit = (parentAnswerId: string) => {
    if (!replyContent.trim()) return;

    const res = addCommunityAnswer({
      postId: post.id,
      authorId: userId,
      authorName: userName,
      authorRole: userRole,
      authorAvatar: userAvatar,
      content: replyContent.trim(),
      parentAnswerId: parentAnswerId,
    });

    if (res.ok) {
      setReplyContent('');
      setReplyToAnswerId(null);
    }
  };

  const handleToggleBestAnswer = (answerId: string, currentIsBest: boolean) => {
    if (!canMarkBestAnswer) return;
    markBestAnswer(post.id, currentIsBest ? null : answerId);
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div 
      className={`bg-white rounded-xl border transition-all duration-200 relative overflow-hidden ${
        post.isPinned 
          ? 'border-indigo-300 ring-1 ring-indigo-100 bg-gradient-to-r from-indigo-50/20 to-white' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Pinned Ribbon */}
      {post.isPinned && (
        <div className="bg-indigo-600 text-white text-[11px] font-semibold px-3 py-0.5 flex items-center gap-1.5 w-max rounded-br-lg">
          <Pin className="w-3 h-3 fill-current" /> Pinned Discussion
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Card Header: Author Info & Status Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenProfile(post.authorId, post.authorName, post.authorRole, post.authorAvatar)}
              className="relative focus:outline-none group shrink-0"
            >
              <img
                src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`}
                alt={post.authorName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all"
              />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onOpenProfile(post.authorId, post.authorName, post.authorRole, post.authorAvatar)}
                  className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm"
                >
                  {post.authorName}
                </button>

                {/* Role Badges */}
                {post.authorRole === 'teacher' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    ✓ TEACHER
                  </span>
                )}
                {(post.authorRole === 'admin' || post.authorRole === 'super_admin') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    ADMIN
                  </span>
                )}
                {post.authorRole === 'student' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                    Student
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{formatRelativeTime(post.createdAt)}</span>
                <span>•</span>
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{post.category}</span>
              </div>
            </div>
          </div>

          {/* Status Badges & Action Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {post.isSolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SOLVED
              </span>
            )}
            {bestAnswer && !post.isSolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Award className="w-3.5 h-3.5 text-amber-600" /> BEST ANSWER
              </span>
            )}

            {/* Menu options */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
                >
                  {isTeacherOrAdmin && (
                    <button
                      onClick={handleTogglePin}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Pin className="w-3.5 h-3.5 text-indigo-600" />
                      {post.isPinned ? 'Unpin Discussion' : 'Pin Discussion'}
                    </button>
                  )}
                  {isAuthor && onEditPost && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEditPost(post);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      Edit Discussion
                    </button>
                  )}
                  {(isAuthor || isTeacherOrAdmin) && (
                    <button
                      onClick={handleDeletePost}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      Delete Discussion
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenReport('post', post.id, post.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-600" />
                    Report Content
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Post Title */}
        <h2 className="text-base font-bold text-slate-900 leading-snug">
          {post.title}
        </h2>

        {/* Post Description Content */}
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {post.content}
        </div>

        {/* Attachment Pill Indicator if file exists */}
        {post.attachmentName && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">{post.attachmentName}</span>
            </div>
            <button
              onClick={() => setFeedback({ kind: 'info', message: `Downloading attachment: ${post.attachmentName}` })}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shrink-0 font-medium"
            >
              Download
            </button>
          </div>
        )}

        {/* Topic Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                <Tag className="w-3 h-3 text-indigo-500" />
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Card Main Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upvote Button */}
            <button
              onClick={handleUpvotePost}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                isUpvotedPost
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isUpvotedPost ? 'fill-indigo-600' : ''}`} />
              <span>{post.upvotesCount || 0} Upvotes</span>
            </button>

            {/* Answer Count Toggle */}
            <button
              onClick={() => setExpandedAnswers(!expandedAnswers)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all font-semibold"
            >
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>💬 {postAnswers.length} Answers</span>
              {expandedAnswers ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />}
            </button>

            {/* Follow Button */}
            <button
              onClick={handleFollowPost}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                isFollowingPost
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${isFollowingPost ? 'fill-indigo-600' : ''}`} />
              <span>{isFollowingPost ? 'Following' : 'Follow'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bookmark / Save Button */}
            <button
              onClick={handleBookmarkPost}
              className={`p-2 rounded-lg border transition-all ${
                isSavedPost
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title={isSavedPost ? 'Remove Save' : 'Save / Bookmark'}
            >
              <Bookmark className={`w-4 h-4 ${isSavedPost ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
              title="Share Discussion"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* INLINE ANSWERS SECTION */}
        {expandedAnswers && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Answers ({sortedAnswers.length})</span>
            </div>

            {/* Answers List */}
            {sortedAnswers.length > 0 ? (
              <div className="space-y-4">
                {sortedAnswers.map((ans) => {
                  const isUpvotedAns = (state.communityUpvotes || []).some(
                    (u) => u.userId === userId && u.targetType === 'answer' && u.targetId === ans.id
                  );
                  const childReplies = postAnswers.filter((a) => a.parentAnswerId === ans.id);

                  return (
                    <div
                      key={ans.id}
                      className={`p-4 rounded-xl border transition-all ${
                        ans.isBestAnswer
                          ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
                          : ans.authorRole === 'teacher'
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      {/* Answer Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => onOpenProfile(ans.authorId, ans.authorName, ans.authorRole, ans.authorAvatar)}
                            className="focus:outline-none shrink-0"
                          >
                            <img
                              src={ans.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ans.authorName)}`}
                              alt={ans.authorName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => onOpenProfile(ans.authorId, ans.authorName, ans.authorRole, ans.authorAvatar)}
                                className="font-bold text-slate-900 text-xs hover:text-indigo-600"
                              >
                                {ans.authorName}
                              </button>
                              {ans.authorRole === 'teacher' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                  ✓ TEACHER
                                </span>
                              )}
                              {ans.authorRole === 'student' && (
                                <span className="text-[10px] font-medium text-slate-500">Student</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{formatRelativeTime(ans.createdAt)}</span>
                          </div>
                        </div>

                        {/* Best Answer Badge & Mark Button */}
                        <div className="flex items-center gap-2">
                          {ans.isBestAnswer && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ✓ Best Answer
                            </span>
                          )}

                          {canMarkBestAnswer && (
                            <button
                              onClick={() => handleToggleBestAnswer(ans.id, ans.isBestAnswer)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all ${
                                ans.isBestAnswer
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {ans.isBestAnswer ? 'Unmark Best' : '✓ Mark as Best Answer'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Answer Content */}
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line mb-3 pl-1">
                        {ans.content}
                      </div>

                      {/* Answer Actions */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-3">
                          {/* Answer Upvote */}
                          <button
                            onClick={() => toggleCommunityUpvote(userId, 'answer', ans.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
                              isUpvotedAns ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${isUpvotedAns ? 'fill-indigo-600' : ''}`} />
                            <span>↑ {ans.upvotesCount || 0}</span>
                          </button>

                          {/* Reply Trigger */}
                          <button
                            onClick={() => setReplyToAnswerId(replyToAnswerId === ans.id ? null : ans.id)}
                            className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-200/60"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                        </div>

                        <button
                          onClick={() => onOpenReport('answer', ans.id, post.id)}
                          className="text-slate-400 hover:text-amber-600 p-1"
                          title="Report Answer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* INLINE THREADED REPLY FORM */}
                      {replyToAnswerId === ans.id && (
                        <div className="mt-3 pl-3 border-l-2 border-indigo-400 pt-2 space-y-2">
                          <p className="text-[11px] font-semibold text-slate-600">Reply to {ans.authorName}...</p>
                          <textarea
                            rows={2}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Type your reply here..."
                            className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyToAnswerId(null)}
                              className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePostReplySubmit(ans.id)}
                              disabled={!replyContent.trim()}
                              className="btn-primary text-xs px-3 py-1 font-semibold disabled:opacity-50"
                            >
                              Post Reply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* THREADED NESTED REPLIES */}
                      {childReplies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-indigo-200 space-y-2.5">
                          {childReplies.map((rep) => (
                            <div key={rep.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{rep.authorName}</span>
                                  {rep.authorRole === 'teacher' && (
                                    <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-700">Teacher</span>
                                  )}
                                  {rep.authorRole === 'student' && (
                                    <span className="text-[9px] text-slate-400">Student</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">{formatRelativeTime(rep.createdAt)}</span>
                              </div>
                              <p className="text-slate-700 leading-normal whitespace-pre-line">{rep.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No answers yet. Be the first to answer!</p>
            )}

            {/* INLINE ANSWER COMPOSER */}
            <div className="pt-2">
              {!showAnswerComposer ? (
                <button
                  onClick={() => setShowAnswerComposer(true)}
                  className="w-full text-left p-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition"
                >
                  Write your answer...
                </button>
              ) : (
                <form onSubmit={handlePostAnswerSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      Posting answer as <span className="text-indigo-600">{userName}</span> ({userRole})
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAnswerComposer(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    placeholder="Write your detailed answer or solution step-by-step..."
                    className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />

                  {/* Attachment indicator if added */}
                  {answerAttachmentName && (
                    <div className="flex items-center justify-between p-2 rounded bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
                      <span className="truncate">📎 Attached: {answerAttachmentName}</span>
                      <button type="button" onClick={() => setAnswerAttachmentName('')} className="text-indigo-600 font-bold hover:underline ml-2">Remove</button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fname = prompt('Enter filename or URL for attachment:', 'solution_notes.pdf');
                          if (fname) setAnswerAttachmentName(fname);
                        }}
                        className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        Attach File
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAnswerContent((prev) => prev + '\n```\n// Insert code snippet here\n```\n');
                        }}
                        className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Code className="w-3.5 h-3.5 text-slate-500" />
                        Add Code
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAnswerComposer(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!answerContent.trim()}
                        className="btn-primary text-xs font-semibold px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Post Answer
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
