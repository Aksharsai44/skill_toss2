import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, MessageSquare, Clock, CheckCircle2, Pin, User, Filter,
  ShieldAlert, Tag, X, Download, Heart, Bookmark, Reply, MoreHorizontal,
  Edit2, PinOff, Users, Megaphone, Paperclip, Send, Circle, AlertTriangle,
  FileText, Calendar, Share2, Check, RotateCcw, HelpCircle, Edit3, Trash2
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/cn';
import type { LmsCommunityMessage } from '@/lib/types';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';

interface CommunityChatWorkspaceProps {
  currentUserRole: 'teacher' | 'student' | 'admin';
}

type CommunityFilterTab = 'all' | 'my_batches' | 'announcements' | 'faculty';
type PostTypeOption = 'Update' | 'Announcement' | 'Assignment' | 'Class Reminder' | 'Important Notice' | 'Discussion';

export function CommunityChatWorkspace({ currentUserRole }: CommunityChatWorkspaceProps) {
  const {
    state,
    sendCommunityMessage,
    toggleMessageReaction,
    pinCommunityMessage,
    deleteCommunityMessage,
    editCommunityMessage,
    onlineStudentIds,
    setFeedback,
  } = useLmsData();

  const { user, profile } = useAuth();

  // User Info & Role Flags
  const currentUserId = user?.id || profile?.id || 'user_guest';
  const currentUserName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = profile?.role || currentUserRole;
  const isTeacher = userRole === 'teacher';
  const isAdminUser = userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';

  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<CommunityFilterTab>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer State
  const [composerText, setComposerText] = useState('');
  const [postType, setPostType] = useState<PostTypeOption>('Update');
  const [targetBatchId, setTargetBatchId] = useState<string>('all');
  const [attachmentFiles, setAttachmentFiles] = useState<PickedAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Inline Reply & Action States
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<string[]>([]);

  // User Batches Resolution for Filter & Target Selectors
  const userBatches = useMemo(() => {
    if (isAdminUser) return state.batches || [];
    if (isTeacher) {
      const teacherObj = state.teachers.find(
        (t) => t.id === currentUserId || (user?.email && t.email.toLowerCase() === user.email.toLowerCase())
      );
      const teacherBatchIds = teacherObj?.batchIds || [];
      if (!teacherBatchIds.length) {
        return state.batches || [];
      }
      const matched = (state.batches || []).filter((b) => teacherBatchIds.includes(b.id) || b.teacherId === teacherObj?.id);
      return matched.length > 0 ? matched : (state.batches || []);
    }
    // Student
    const studentObj = state.students.find(
      (s) => s.id === currentUserId || (user?.email && s.email.toLowerCase() === user.email.toLowerCase())
    );
    const studentBatchId = studentObj?.batchId;
    const matchedStudentBatches = (state.batches || []).filter((b) => b.id === studentBatchId);
    return matchedStudentBatches.length > 0 ? matchedStudentBatches : (state.batches || []);
  }, [state.batches, state.teachers, state.students, isTeacher, isAdminUser, currentUserId, user?.email]);

  // Online Members Count Calculation
  const realOnlineCount = useMemo(() => {
    const activeStudents = (onlineStudentIds || []).length;
    const activeTeachers = state.teachers.length;
    return Math.max(1, activeStudents + activeTeachers);
  }, [onlineStudentIds, state.teachers]);

  // Real-Time Broadcast Listener across local browser tabs
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('skilltoss_community_channel');
      bc.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        if (event.data.type === 'NEW_COMMUNITY_MESSAGE') {
          const newMsg = event.data.payload as LmsCommunityMessage;
          if (newMsg.senderId !== currentUserId) {
            setFeedback({
              kind: 'info',
              message: `New community update from ${newMsg.senderName}: "${newMsg.messageText.substring(0, 35)}..."`,
            });
          }
        }
      };
    } catch {}
    return () => {
      if (bc) bc.close();
    };
  }, [currentUserId, setFeedback]);

  // Handle Post Creation from Large Composer Card
  const handleCreatePost = async () => {
    if (!composerText.trim() && attachmentFiles.length === 0) return;
    setIsPosting(true);

    try {
      let attachmentUrl = '';
      let attachmentName = '';
      let attachmentSize = '';

      if (attachmentFiles.length > 0) {
        const first = attachmentFiles[0];
        attachmentName = first.metadata.fileName;
        attachmentSize = `${(first.metadata.fileSize / 1024).toFixed(0)} KB`;
        if (first.file) {
          attachmentUrl = URL.createObjectURL(first.file);
        }
      }

      const isAnnouncementType = postType === 'Announcement' || postType === 'Important Notice';
      const resolvedBatchId = targetBatchId === 'all' ? (isAnnouncementType ? 'announcements' : 'all_batches') : targetBatchId;

      await sendCommunityMessage({
        batchId: resolvedBatchId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: (userRole as any) || 'teacher',
        senderAvatar:
          (profile as any)?.avatar ||
          user?.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`,
        messageText: composerText.trim(),
        messageType: isAnnouncementType ? 'announcement' : attachmentUrl ? 'file' : 'text',
        announcementTitle: isAnnouncementType ? `${postType.toUpperCase()}: Academic Notice` : '',
        announcementDate: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        postCategory: postType,
        isPinned: isAnnouncementType && (isTeacher || isAdminUser),
        attachmentUrl,
        attachmentName,
        attachmentSize,
        readBy: [currentUserId],
      });

      setComposerText('');
      setAttachmentFiles([]);
      setShowAttachmentPicker(false);
      setPostType('Update');
      setTargetBatchId('all');
      setFeedback({ kind: 'success', message: 'Academic update posted successfully.' });
    } finally {
      setIsPosting(false);
    }
  };

  // Handle Inline Reply Posting directly under post
  const handleSendInlineReply = async (parentMsg: LmsCommunityMessage) => {
    if (!replyInputText.trim()) return;

    await sendCommunityMessage({
      batchId: parentMsg.batchId || 'all_batches',
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: (userRole as any) || 'teacher',
      senderAvatar:
        (profile as any)?.avatar ||
        user?.user_metadata?.avatar_url ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`,
      messageText: replyInputText.trim(),
      messageType: 'text',
      replyToId: parentMsg.id,
      replyToSenderName: parentMsg.senderName,
      replyToText: parentMsg.messageText,
      readBy: [currentUserId],
    });

    setReplyInputText('');
    setActiveReplyPostId(null);
    setFeedback({ kind: 'success', message: 'Reply posted.' });
  };

  // Toggle Save / Bookmark Post
  const handleToggleSave = (msgId: string) => {
    setSavedMessageIds((prev) => {
      const exists = prev.includes(msgId);
      const updated = exists ? prev.filter((id) => id !== msgId) : [...prev, msgId];
      setFeedback({ kind: 'info', message: exists ? 'Removed from saved items' : 'Saved to your bookmarks' });
      return updated;
    });
  };

  // Handle File Download
  const handleDownloadFile = (msg: LmsCommunityMessage) => {
    if (msg.attachmentUrl) {
      const a = document.createElement('a');
      a.href = msg.attachmentUrl;
      a.download = msg.attachmentName || 'attachment';
      a.click();
    } else {
      setFeedback({ kind: 'info', message: `Downloading ${msg.attachmentName || 'attachment'}...` });
    }
  };

  // Accessible messages list based on role batch authorization
  const accessibleMessages = useMemo(() => {
    const all = state.communityMessages || [];
    if (isAdminUser) return all;

    if (currentUserRole === 'student') {
      const studentObj = state.students.find(
        (s) => s.id === currentUserId || (user?.email && s.email.toLowerCase() === user.email.toLowerCase())
      );
      const studentBatchId = studentObj?.batchId;
      return all.filter(
        (m) =>
          m.batchId === 'announcements' ||
          m.batchId === 'all_batches' ||
          !m.batchId ||
          !studentBatchId ||
          m.batchId === studentBatchId
      );
    }

    if (currentUserRole === 'teacher') {
      const teacherObj = state.teachers.find(
        (t) => t.id === currentUserId || (user?.email && t.email.toLowerCase() === user.email.toLowerCase())
      );
      const teacherBatches = teacherObj?.batchIds || state.batches.map((b) => b.id);
      return all.filter(
        (m) =>
          m.batchId === 'announcements' ||
          m.batchId === 'all_batches' ||
          m.batchId === 'faculty_general' ||
          !m.batchId ||
          teacherBatches.includes(m.batchId)
      );
    }

    return all;
  }, [state.communityMessages, isAdminUser, currentUserRole, currentUserId, user?.email, state.students, state.teachers, state.batches]);

  // Filter messages based on Active Tab, Batch Selector, and Search Query
  const filteredFeedMessages = useMemo(() => {
    let list = [...accessibleMessages];

    // 1. Tab Filter
    if (activeTab === 'my_batches') {
      list = list.filter((m) => m.batchId !== 'announcements' && m.batchId !== 'faculty_general');
    } else if (activeTab === 'announcements') {
      list = list.filter(
        (m) => m.messageType === 'announcement' || m.postCategory === 'Announcement' || m.postCategory === 'Important Notice' || m.isPinned
      );
    } else if (activeTab === 'faculty') {
      list = list.filter((m) => m.batchId === 'faculty_general' || m.senderRole === 'teacher' || m.senderRole === 'admin');
    }

    // 2. Specific Batch Filter
    if (selectedBatchId !== 'all') {
      list = list.filter((m) => m.batchId === selectedBatchId);
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const textMatch = m.messageText.toLowerCase().includes(q);
        const nameMatch = m.senderName.toLowerCase().includes(q);
        const titleMatch = m.announcementTitle ? m.announcementTitle.toLowerCase().includes(q) : false;
        const catMatch = m.postCategory ? m.postCategory.toLowerCase().includes(q) : false;
        return textMatch || nameMatch || titleMatch || catMatch;
      });
    }

    return list;
  }, [accessibleMessages, activeTab, selectedBatchId, searchQuery]);

  // Separate parent posts and child replies
  const parentPosts = useMemo(() => {
    const parents = filteredFeedMessages.filter((m) => !m.replyToId);
    return parents.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredFeedMessages]);

  const repliesMap = useMemo(() => {
    const map: Record<string, LmsCommunityMessage[]> = {};
    accessibleMessages.forEach((m) => {
      if (m.replyToId) {
        if (!map[m.replyToId]) map[m.replyToId] = [];
        map[m.replyToId].push(m);
      }
    });
    // Sort replies chronologically
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    return map;
  }, [accessibleMessages]);

  return (
    <div className="w-full max-w-[95%] mx-auto space-y-6">
      {/* 1. PAGE HEADER WITH REAL ONLINE PRESENCE COUNT */}
      <PageHeader
        title="Academic Community"
        subtitle="Connect with your students, share academic updates, and communicate in real time."
        actions={
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-2xs">
            <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span>{realOnlineCount} Members Online</span>
          </div>
        }
      />

      {/* 2. TOP COMMUNITY FILTERS BAR & BATCH SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Horizontal Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'my_batches', label: 'My Batches' },
            { id: 'announcements', label: 'Announcements' },
            { id: 'faculty', label: 'Faculty' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CommunityFilterTab)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs whitespace-nowrap',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Batch Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide shrink-0">Filter Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="all">All Batches</option>
            {userBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. LARGE PROMINENT SHARE / ANNOUNCEMENT COMPOSER CARD */}
      <Card className="p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <img
            src={
              (profile as any)?.avatar ||
              user?.user_metadata?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`
            }
            alt={currentUserName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
          />
          <div className="flex-1 space-y-1">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Share an update with your students
            </h3>
            <textarea
              rows={3}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="What's happening? Share an academic update, announcement, reminder, or important information..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
            />
          </div>
        </div>

        {/* ATTACHMENT PREVIEW IF PICKED */}
        {attachmentFiles.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            <div className="flex items-center gap-2 truncate">
              <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-bold truncate">{attachmentFiles[0].metadata.fileName}</span>
              <span className="text-indigo-500 text-[11px]">({(attachmentFiles[0].metadata.fileSize / 1024).toFixed(0)} KB)</span>
            </div>
            <button
              onClick={() => setAttachmentFiles([])}
              className="p-1 text-indigo-500 hover:text-indigo-800 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ATTACHMENT PICKER MODAL / BOX */}
        {showAttachmentPicker && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <FileAttachmentPicker
              ownerId={currentUserId}
              ownerType="note"
              files={attachmentFiles}
              onChange={(files) => {
                setAttachmentFiles(files);
                if (files.length > 0) setShowAttachmentPicker(false);
              }}
            />
          </div>
        )}

        {/* COMPOSER ACTIONS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              <Paperclip className="w-4 h-4 text-slate-600" />
              <span>Attachment</span>
            </button>

            {/* Post Type Selector */}
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostTypeOption)}
              className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Update">Update</option>
              <option value="Announcement">Announcement 📢</option>
              <option value="Assignment">Assignment 📝</option>
              <option value="Class Reminder">Class Reminder ⏰</option>
              <option value="Important Notice">Important Notice ⚠️</option>
              <option value="Discussion">Discussion 💬</option>
            </select>

            {/* Target Batch Selector */}
            <select
              value={targetBatchId}
              onChange={(e) => setTargetBatchId(e.target.value)}
              className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Students</option>
              {userBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Post Button */}
          <button
            type="button"
            disabled={isPosting || (!composerText.trim() && attachmentFiles.length === 0)}
            onClick={handleCreatePost}
            className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isPosting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </Card>

      {/* 4. CLEAN SEARCH BAR */}
      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search updates, announcements, messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all"
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

      {/* 5. ACTIVITY FEED (CLEAN TEAM COMMUNITY CARDS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Activity Feed
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {parentPosts.length} {parentPosts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {parentPosts.length > 0 ? (
          parentPosts.map((post) => {
            const isLiked = post.reactions && post.reactions['❤️'] && post.reactions['❤️'].includes(currentUserId);
            const likesCount = post.reactions && post.reactions['❤️'] ? post.reactions['❤️'].length : 0;
            const isSaved = savedMessageIds.includes(post.id);
            const postReplies = repliesMap[post.id] || [];
            const isAnnouncement =
              post.messageType === 'announcement' || post.postCategory === 'Announcement' || post.postCategory === 'Important Notice';

            const batchObj = state.batches.find((b) => b.id === post.batchId);
            const batchName = post.batchId === 'announcements' || post.batchId === 'all_batches' ? 'All Batches' : batchObj?.name || 'Academic Update';

            return (
              <Card
                key={post.id}
                className={cn(
                  'p-4 sm:p-5 bg-white border rounded-2xl space-y-3.5 transition-all shadow-2xs',
                  post.isPinned ? 'border-indigo-300 ring-2 ring-indigo-50/50 bg-indigo-50/10' : 'border-slate-200'
                )}
              >
                {/* PINNED INDICATOR */}
                {post.isPinned && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg w-fit border border-indigo-200">
                    <Pin className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
                    <span>Pinned Announcement</span>
                  </div>
                )}

                {/* POST AUTHOR HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        post.senderAvatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.senderName)}`
                      }
                      alt={post.senderName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">{post.senderName}</span>

                        {/* ROLE BADGE */}
                        {post.senderRole === 'teacher' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase tracking-wide border border-indigo-200">
                            ✓ Teacher
                          </span>
                        ) : post.senderRole === 'admin' || post.senderRole === 'super_admin' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 uppercase tracking-wide border border-amber-200">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Student
                          </span>
                        )}
                      </div>

                      {/* CONTEXT METADATA */}
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {batchName} {post.postCategory ? `· ${post.postCategory}` : ''} ·{' '}
                        {new Date(post.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* THREE-DOT MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeMenuId === post.id && (
                      <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-1 space-y-1 text-xs font-semibold text-slate-700">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?post=${post.id}`);
                            setFeedback({ kind: 'success', message: 'Post link copied to clipboard' });
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500" /> Copy Link
                        </button>

                        {(isTeacher || isAdminUser) && (
                          <button
                            onClick={() => {
                              pinCommunityMessage(post.id, !post.isPinned);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Pin className="w-3.5 h-3.5 text-indigo-600" /> {post.isPinned ? 'Unpin Post' : 'Pin to Top'}
                          </button>
                        )}

                        {(post.senderId === currentUserId || isAdminUser) && (
                          <button
                            onClick={() => {
                              deleteCommunityMessage(post.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ANNOUNCEMENT BANNER VISUAL TREATMENT */}
                {isAnnouncement && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-amber-800">
                      <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{post.announcementTitle || 'Important Announcement'}</span>
                    </div>
                  </div>
                )}

                {/* POST CONTENT TEXT */}
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                  {post.messageText}
                </p>

                {/* ATTACHMENT CARD IF PRESENT */}
                {post.attachmentName && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold truncate">{post.attachmentName}</span>
                      {post.attachmentSize && <span className="text-slate-400 text-[11px]">({post.attachmentSize})</span>}
                    </div>
                    <button
                      onClick={() => handleDownloadFile(post)}
                      className="px-3 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1 text-xs shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                )}

                {/* INTERACTION BAR (LIKE, REPLY, SAVE, PIN) */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-4">
                    {/* Upvote / Like */}
                    <button
                      onClick={() => toggleMessageReaction(post.id, '❤️', currentUserId)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition',
                        isLiked ? 'bg-red-50 text-red-600' : 'hover:bg-slate-100 text-slate-600'
                      )}
                    >
                      <Heart className={cn('w-4 h-4', isLiked ? 'fill-red-500 text-red-500' : '')} />
                      <span>{likesCount > 0 ? `${likesCount} Likes` : 'Like'}</span>
                    </button>

                    {/* Reply Toggle */}
                    <button
                      onClick={() => setActiveReplyPostId(activeReplyPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition text-slate-600"
                    >
                      <Reply className="w-4 h-4 text-indigo-600" />
                      <span>{postReplies.length > 0 ? `${postReplies.length} Replies` : 'Reply'}</span>
                    </button>

                    {/* Save / Bookmark */}
                    <button
                      onClick={() => handleToggleSave(post.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition',
                        isSaved ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
                      )}
                    >
                      <Bookmark className={cn('w-4 h-4', isSaved ? 'fill-indigo-600 text-indigo-600' : '')} />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                {/* INLINE REPLIES STREAM & INLINE REPLY COMPOSER */}
                {(postReplies.length > 0 || activeReplyPostId === post.id) && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3 sm:p-4 rounded-xl">
                    {/* Nested Replies List */}
                    {postReplies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-2.5 text-xs border-l-2 border-indigo-200 pl-3 py-1">
                        <img
                          src={
                            reply.senderAvatar ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reply.senderName)}`
                          }
                          alt={reply.senderName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{reply.senderName}</span>
                            {reply.senderRole === 'teacher' && (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                                Teacher
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(reply.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 font-normal leading-relaxed">{reply.messageText}</p>
                        </div>
                      </div>
                    ))}

                    {/* Inline Reply Input Box */}
                    {activeReplyPostId === post.id && (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={replyInputText}
                          onChange={(e) => setReplyInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendInlineReply(post);
                            }
                          }}
                          placeholder="Write a reply..."
                          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        />
                        <button
                          onClick={() => handleSendInlineReply(post)}
                          disabled={!replyInputText.trim()}
                          className="btn-primary px-4 py-2 rounded-xl text-xs font-bold shadow-2xs disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          /* EMPTY STATE */
          <Card className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
            <MessageSquare className="w-12 h-12 text-indigo-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No updates yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Share the first academic update with your students.
            </p>
            <button
              onClick={() => {
                const textarea = document.querySelector('textarea');
                if (textarea) textarea.focus();
              }}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Share Update
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
