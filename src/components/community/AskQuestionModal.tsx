import React, { useState } from 'react';
import type { CommunityPostType } from '@/lib/types';
import { useAuth } from '@/lib/authContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { FileAttachmentPicker } from '@/components/FileAttachmentPicker';
import type { SubmissionAttachment } from '@/lib/types';
import { X, HelpCircle, MessageSquare, Tag, Paperclip, Send, AlertCircle } from 'lucide-react';

interface AskQuestionModalProps {
  open: boolean;
  onClose: () => void;
  initialPostType?: CommunityPostType;
}

const CATEGORIES = [
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
  'Other',
];

const DEFAULT_TAGS = [
  '#Python', '#DSA', '#WebDev', '#DataScience', '#MachineLearning', '#AI', '#Projects', '#Placements', '#Database'
];

export function AskQuestionModal({
  open,
  onClose,
  initialPostType = 'question',
}: AskQuestionModalProps) {
  const { user, profile } = useAuth();
  const { state, createCommunityPost, setFeedback } = useLmsData();

  const [postType, setPostType] = useState<CommunityPostType>(initialPostType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState<string>(state.courses[0]?.id || '');
  const [batchId, setBatchId] = useState<string>('');
  const [category, setCategory] = useState('Data Structures');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['#DataStructures']);
  const [attachment, setAttachment] = useState<{ metadata: SubmissionAttachment; file?: File } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const userId = user?.id || profile?.id || 'guest';
  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = (profile?.role || 'student') as 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
  const userAvatar = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#+/, '');
      if (val && !selectedTags.includes(`#${val}`)) {
        setSelectedTags([...selectedTags, `#${val}`]);
        setTagInput('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a clear question or discussion title.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please provide details or context for your post.');
      return;
    }

    const selectedCourseObj = state.courses.find((c) => c.id === courseId);

    const res = createCommunityPost({
      title: title.trim(),
      content: content.trim(),
      postType,
      authorId: userId,
      authorName: userName,
      authorRole: userRole,
      authorAvatar: userAvatar,
      category: category || selectedCourseObj?.category || 'General',
      tags: selectedTags.length > 0 ? selectedTags : ['#General'],
      batchId: batchId || '',
      departmentId: courseId || '',
      attachmentName: attachment?.metadata.fileName || '',
      attachmentUrl: attachment?.metadata.fileName || '',
    });

    if (res.ok) {
      setFeedback({ kind: 'success', message: res.message });
      setTitle('');
      setContent('');
      setSelectedTags(['#DataStructures']);
      setAttachment(null);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => setPostType('question')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                postType === 'question'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Ask Question
            </button>
            <button
              type="button"
              onClick={() => setPostType('discussion')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                postType === 'discussion'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Start Discussion
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              {postType === 'question' ? 'Question Title' : 'Discussion Title'} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                postType === 'question'
                  ? 'e.g. How does binary tree traversal work?'
                  : 'e.g. Best practices for optimizing React re-renders in 2026'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Course & Batch Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Course *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select Course</option>
                {state.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Batch (Optional)
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Batches</option>
                {state.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject / Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Subject / Educational Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Content Textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description & Details *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'question'
                  ? 'Can someone explain inorder, preorder and postorder traversal with a simple example?'
                  : 'Share your ideas, learning resource summary, or topic for community discussion...'
              }
              className="w-full p-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Educational Topic Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Topic Tags</span>
              <span className="text-[11px] font-normal text-slate-400">Press Enter or comma to add tag</span>
            </label>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DEFAULT_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              placeholder="Type custom hashtag..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Optional Attachment Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-indigo-600" /> Optional Learning Attachment
            </label>
            <FileAttachmentPicker
              ownerType="note"
              ownerId={userId}
              files={attachment ? [attachment] : []}
              onChange={(files) => setAttachment(files[0] || null)}
              maxFiles={1}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs font-semibold px-5 py-2.5 flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> {postType === 'question' ? 'Post Question' : 'Post Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
