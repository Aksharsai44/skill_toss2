import React, { useState } from 'react';
import type { CommunityPost, CommunityAnswer } from '@/lib/types';
import { useAuth } from '@/lib/authContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { 
  X, ThumbsUp, MessageSquare, Bookmark, Share2, Award, CheckCircle2, 
  Send, CornerDownRight, Tag, Download, Eye, Bell, ShieldAlert, Flag
} from 'lucide-react';

interface QuestionDetailModalProps {
  post: CommunityPost | null;
  onClose: () => void;
  onOpenProfile: (userId: string, userName: string, userRole: string, userAvatar?: string) => void;
  onOpenReport: (targetType: 'post' | 'answer', targetId: string, postId: string) => void;
}

export function QuestionDetailModal({
  post,
  onClose,
  onOpenProfile,
  onOpenReport,
}: QuestionDetailModalProps) {
  const { user, profile } = useAuth();
  const { state, addCommunityAnswer, toggleCommunityUpvote, toggleCommunityBookmark, toggleCommunityFollow, markBestAnswer, setFeedback } = useLmsData();

  const [answerContent, setAnswerContent] = useState('');
  const [replyToAnswerId, setReplyToAnswerId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  if (!post) return null;

  const userId = user?.id || profile?.id || 'guest';
  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = (profile?.role || 'student') as 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
  const userAvatar = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

  const isQuestionAuthor = post.authorId === userId;
  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';
  const canMarkBestAnswer = isQuestionAuthor || isTeacherOrAdmin;

  const isUpvotedPost = (state.communityUpvotes || []).some(
    (u) => u.userId === userId && u.targetType === 'post' && u.targetId === post.id
  );
  const isSavedPost = (state.communityBookmarks || []).some(
    (b) => b.userId === userId && b.postId === post.id
  );
  const isFollowingPost = (state.communityFollows || []).some(
    (f) => f.userId === userId && f.postId === post.id
  );

  const allAnswers = (state.communityAnswers || []).filter(
    (a) => a.postId === post.id && !a.isHidden
  );

  // Separate top level answers vs threaded replies
  const topLevelAnswers = allAnswers.filter((a) => !a.parentAnswerId);

  // Sort answers: Best Answer first, then teacher answers, then highest upvotes
  const sortedAnswers = [...topLevelAnswers].sort((a, b) => {
    if (a.isBestAnswer) return -1;
    if (b.isBestAnswer) return 1;
    if (a.authorRole === 'teacher' && b.authorRole !== 'teacher') return -1;
    if (b.authorRole === 'teacher' && a.authorRole !== 'teacher') return 1;
    return (b.upvotesCount || 0) - (a.upvotesCount || 0);
  });

  const handlePostAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim()) return;

    const res = addCommunityAnswer({
      postId: post.id,
      authorId: userId,
      authorName: userName,
      authorRole: userRole,
      authorAvatar: userAvatar,
      content: answerContent.trim(),
    });

    if (res.ok) {
      setAnswerContent('');
    }
  };

  const handlePostReply = (parentAnswerId: string) => {
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

  const handleToggleUpvoteAnswer = (answerId: string) => {
    toggleCommunityUpvote(userId, 'answer', answerId);
  };

  const handleToggleBestAnswer = (answerId: string, currentIsBest: boolean) => {
    if (!canMarkBestAnswer) return;
    markBestAnswer(post.id, currentIsBest ? null : answerId);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700">
              {post.postType === 'question' ? 'Question & Answer' : 'Discussion'}
            </span>
            <span className="text-xs font-semibold text-slate-500">• {post.category}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleCommunityFollow(userId, post.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isFollowingPost
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${isFollowingPost ? 'fill-indigo-600' : ''}`} />
              {isFollowingPost ? 'Following' : 'Follow'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Question / Discussion Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onOpenProfile(post.authorId, post.authorName, post.authorRole, post.authorAvatar)}
                  className="focus:outline-none"
                >
                  <img
                    src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`}
                    alt={post.authorName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 hover:ring-indigo-300 transition-all"
                  />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenProfile(post.authorId, post.authorName, post.authorRole, post.authorAvatar)}
                      className="font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors"
                    >
                      {post.authorName}
                    </button>
                    {post.authorRole === 'teacher' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        ✓ TEACHER
                      </span>
                    )}
                    {post.authorRole === 'student' && (
                      <span className="text-xs font-medium text-slate-500">Student</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatTime(post.createdAt)}</p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                {post.isSolved && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 🟢 SOLVED
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
              {post.title}
            </h1>

            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line mb-5">
              {post.content}
            </div>

            {/* Optional Attachment */}
            {post.attachmentName && (
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{post.attachmentName}</p>
                    <p className="text-[11px] text-slate-500">Attached Resource Material</p>
                  </div>
                </div>
                <button
                  onClick={() => setFeedback({ kind: 'info', message: 'Downloading attachment...' })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Download
                </button>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {post.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    <Tag className="w-3 h-3 text-indigo-500" />
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}

            {/* Engagement Stats & Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCommunityUpvote(userId, 'post', post.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    isUpvotedPost
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${isUpvotedPost ? 'fill-indigo-600' : ''}`} />
                  <span>{post.upvotesCount || 0} Upvotes</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>{allAnswers.length} Answers</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCommunityBookmark(userId, post.id)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    isSavedPost
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  title={isSavedPost ? 'Remove Bookmark' : 'Save Bookmark'}
                >
                  <Bookmark className={`w-4 h-4 ${isSavedPost ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={() => onOpenReport('post', post.id, post.id)}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                  title="Report Post"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Answer Submission Box */}
          <form onSubmit={handlePostAnswer} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" /> Write your answer
              </label>
              <span className="text-xs text-slate-500">
                Posting as <strong className="text-slate-800">{userName}</strong> ({userRole})
              </span>
            </div>

            <textarea
              rows={3}
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              placeholder="Share your knowledge or solution step-by-step..."
              className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!answerContent.trim()}
                className="btn-primary text-xs font-semibold px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" /> Submit Answer
              </button>
            </div>
          </form>

          {/* Answers List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
              <span>Answers ({sortedAnswers.length})</span>
            </h3>

            {sortedAnswers.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No answers yet</h4>
                <p className="text-xs text-slate-500 mt-1">Be the first to share your approach and help your classmates!</p>
              </div>
            ) : (
              sortedAnswers.map((answer) => {
                const isUpvotedAnswer = (state.communityUpvotes || []).some(
                  (u) => u.userId === userId && u.targetType === 'answer' && u.targetId === answer.id
                );
                const childReplies = allAnswers.filter((a) => a.parentAnswerId === answer.id);

                return (
                  <div
                    key={answer.id}
                    className={`p-5 rounded-xl border transition-all ${
                      answer.isBestAnswer
                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
                        : answer.authorRole === 'teacher'
                        ? 'bg-blue-50/30 border-blue-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Answer Author Bar */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onOpenProfile(answer.authorId, answer.authorName, answer.authorRole, answer.authorAvatar)}
                          className="focus:outline-none"
                        >
                          <img
                            src={answer.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(answer.authorName)}`}
                            alt={answer.authorName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 hover:ring-indigo-300 transition-all"
                          />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onOpenProfile(answer.authorId, answer.authorName, answer.authorRole, answer.authorAvatar)}
                              className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                            >
                              {answer.authorName}
                            </button>

                            {answer.authorRole === 'teacher' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                ✓ TEACHER ANSWER
                              </span>
                            )}
                            {answer.authorRole === 'student' && (
                              <span className="text-xs font-medium text-slate-500">Student</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(answer.createdAt)}</p>
                        </div>
                      </div>

                      {/* Best Answer Badge & Toggle Button */}
                      <div className="flex items-center gap-2">
                        {answer.isBestAnswer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Award className="w-4 h-4 text-amber-600" /> ✓ BEST ANSWER
                          </span>
                        )}

                        {canMarkBestAnswer && (
                          <button
                            onClick={() => handleToggleBestAnswer(answer.id, answer.isBestAnswer)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              answer.isBestAnswer
                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {answer.isBestAnswer ? 'Unmark Best Answer' : 'Mark as Best Answer'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Answer Body */}
                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-4">
                      {answer.content}
                    </div>

                    {/* Answer Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleUpvoteAnswer(answer.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                            isUpvotedAnswer
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isUpvotedAnswer ? 'fill-indigo-600' : ''}`} />
                          <span>{answer.upvotesCount || 0} Upvotes</span>
                        </button>

                        <button
                          onClick={() => setReplyToAnswerId(replyToAnswerId === answer.id ? null : answer.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                        >
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                          Reply
                        </button>
                      </div>

                      <button
                        onClick={() => onOpenReport('answer', answer.id, post.id)}
                        className="text-slate-400 hover:text-amber-600 p-1"
                        title="Report Answer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Threaded Reply Box if active */}
                    {replyToAnswerId === answer.id && (
                      <div className="mt-3 pl-4 border-l-2 border-indigo-400 pt-2 space-y-2">
                        <textarea
                          rows={2}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${answer.authorName}...`}
                          className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyToAnswerId(null)}
                            className="px-3 py-1 rounded-md text-xs text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePostReply(answer.id)}
                            className="btn-primary text-xs px-3 py-1"
                          >
                            Post Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nested Child Replies */}
                    {childReplies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-3">
                        {childReplies.map((reply) => (
                          <div key={reply.id} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900">{reply.authorName}</span>
                              <span className="text-[10px] text-slate-400">{formatTime(reply.createdAt)}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
