import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, HelpCircle, MessageSquare, Flame, Clock, Award,
  CheckCircle2, Bookmark, Bell, Flag, Pin, User, Filter, Sparkles,
  TrendingUp, BarChart2, ShieldAlert, Layers, Tag, X, ChevronRight,
  Download, Eye, ThumbsUp, RefreshCw, AlertCircle, Trash2, Check, RotateCcw,
  Paperclip, Send, Smile, Reply, MoreVertical, Edit2, PinOff, Users,
  Megaphone, ExternalLink, Loader2, Volume2, CheckCheck, Circle, Info
} from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/cn';
import type { CommunityPost, LmsCommunityMessage, SubmissionAttachment } from '@/lib/types';
import { DiscussionCard } from '@/components/community/DiscussionCard';
import { AskQuestionModal } from '@/components/community/AskQuestionModal';
import { QuestionDetailModal } from '@/components/community/QuestionDetailModal';
import { UserProfileModal } from '@/components/community/UserProfileModal';
import { ReportModal } from '@/components/community/ReportModal';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';
import { getAttachment } from '@/lib/attachmentStorage';

interface CommunityHubProps {
  currentUserRole: 'teacher' | 'student' | 'admin';
}

type MainTab = 'chat' | 'feed' | 'admin_moderation' | 'admin_analytics';
type DiscoverFilter = 'for_you' | 'latest' | 'popular' | 'unanswered' | 'solved';
type MySpaceFilter = 'my_posts' | 'my_answers' | 'saved' | 'following';
type ChannelCategory = 'all' | 'batches' | 'announcements' | 'faculty';

const EMOJI_LIST = ['👍', '❤️', '😂', '👏', '❓', '🔥'];
const TOPIC_TAGS = ['#Python', '#DataStructures', '#AI / ML', '#WebDevelopment', '#DataScience', '#Projects', '#Placements'];

export function CommunityHub({ currentUserRole }: CommunityHubProps) {
  const {
    state,
    sendCommunityMessage,
    toggleMessageReaction,
    pinCommunityMessage,
    deleteCommunityMessage,
    editCommunityMessage,
    markCommunityChannelAsRead,
    adminModerateReport,
    onlineStudentIds,
    setFeedback,
  } = useLmsData();

  const { user, profile } = useAuth();

  // Active User Info
  const currentUserId = user?.id || profile?.id || 'user_guest';
  const currentUserName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = profile?.role || currentUserRole;
  const isTeacher = userRole === 'teacher';
  const isAdminUser = userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const [channelCategory, setChannelCategory] = useState<ChannelCategory>('all');
  const [searchChannelQuery, setSearchChannelQuery] = useState('');

  // Modals state for Forum Q&A
  const [showAskModal, setShowAskModal] = useState(false);
  const [askModalInitialType, setAskModalInitialType] = useState<'question' | 'discussion'>('question');
  const [selectedDetailPost, setSelectedDetailPost] = useState<CommunityPost | null>(null);
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>('for_you');
  const [mySpaceFilter, setMySpaceFilter] = useState<MySpaceFilter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ id: string; name: string; role: string; avatar?: string } | null>(null);
  const [selectedReportTarget, setSelectedReportTarget] = useState<{ targetType: 'post' | 'answer'; targetId: string; postId: string } | null>(null);

  // --------------------------------------------------------------------------
  // LIVE CHAT STATE & CHANNELS CONFIG
  // --------------------------------------------------------------------------
  const allChannels = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: ChannelCategory;
      description: string;
      memberCount: number;
      icon: any;
    }> = [
      {
        id: 'announcements',
        name: '📢 Important Announcements',
        type: 'announcements',
        description: 'Official academic notices, exam timetables & schedule changes',
        memberCount: state.students.length + state.teachers.length,
        icon: Megaphone,
      },
    ];

    state.batches.forEach((batch) => {
      const studentCount = state.students.filter((s) => s.batchId === batch.id).length;
      list.push({
        id: batch.id,
        name: `📚 ${batch.name}`,
        type: 'batches' as const,
        description: `Official batch discussion & live Q&A for ${batch.name}`,
        memberCount: studentCount || 24,
        icon: Users,
      });
    });

    if (isTeacher || isAdminUser) {
      list.push({
        id: 'faculty_general',
        name: '🏛️ Faculty & Staff Lounge',
        type: 'faculty' as const,
        description: 'Inter-departmental teacher collaboration & curriculum discussion',
        memberCount: state.teachers.length,
        icon: ShieldAlert,
      });
    }

    return list;
  }, [state.batches, state.students, state.teachers, isTeacher, isAdminUser]);

  // Active channel selection
  const [activeChannelId, setActiveChannelId] = useState<string>(allChannels[0]?.id || 'announcements');
  const activeChannel = useMemo(() => allChannels.find((c) => c.id === activeChannelId) || allChannels[0], [allChannels, activeChannelId]);

  // Chat search & filter
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Composer State
  const [chatInput, setChatInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<LmsCommunityMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<LmsCommunityMessage | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<PickedAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Smart Announcement Modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', text: '', targetDate: '' });

  // Typing Indicators
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Mark active channel as read when channel changes
  useEffect(() => {
    if (activeChannelId) {
      markCommunityChannelAsRead(activeChannelId, currentUserId);
    }
  }, [activeChannelId, currentUserId, markCommunityChannelAsRead]);

  // Auto-scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.communityMessages, activeChannelId, scrollToBottom]);

  // Realtime Broadcast channel subscriber for typing and instant message sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('skilltoss_community_channel');
      bc.onmessage = (event) => {
        if (!event.data || !event.data.type) return;
        if (event.data.type === 'TYPING' && event.data.channelId === activeChannelId && event.data.userId !== currentUserId) {
          setTypingUsers((prev) => Array.from(new Set([...prev, event.data.userName])));
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((name) => name !== event.data.userName));
          }, 3000);
        }
      };
    } catch {}
    return () => {
      if (bc) bc.close();
    };
  }, [activeChannelId, currentUserId]);

  const handleTyping = () => {
    try {
      const bc = new BroadcastChannel('skilltoss_community_channel');
      bc.postMessage({ type: 'TYPING', channelId: activeChannelId, userId: currentUserId, userName: currentUserName });
      bc.close();
    } catch {}
  };

  // Filter messages for active channel
  const activeChannelMessages = useMemo(() => {
    let msgs = (state.communityMessages || []).filter((m) => m.batchId === activeChannelId);
    if (showPinnedOnly) {
      msgs = msgs.filter((m) => m.isPinned);
    }
    if (chatSearchTerm.trim()) {
      const q = chatSearchTerm.toLowerCase().trim();
      msgs = msgs.filter((m) =>
        m.messageText.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        (m.announcementTitle && m.announcementTitle.toLowerCase().includes(q))
      );
    }
    return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [state.communityMessages, activeChannelId, showPinnedOnly, chatSearchTerm]);

  const pinnedMessages = useMemo(() => {
    return (state.communityMessages || []).filter((m) => m.batchId === activeChannelId && m.isPinned);
  }, [state.communityMessages, activeChannelId]);

  // Calculate unread counts per channel
  const unreadPerChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    (state.communityMessages || []).forEach((m) => {
      if (!m.readBy || !m.readBy.includes(currentUserId)) {
        counts[m.batchId] = (counts[m.batchId] || 0) + 1;
      }
    });
    return counts;
  }, [state.communityMessages, currentUserId]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadPerChannel).reduce((a, b) => a + b, 0);
  }, [unreadPerChannel]);

  // Filtered Channel List
  const filteredChannels = useMemo(() => {
    return allChannels.filter((c) => {
      const matchesCat = channelCategory === 'all' || c.type === channelCategory;
      const matchesSearch = !searchChannelQuery.trim() || c.name.toLowerCase().includes(searchChannelQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allChannels, channelCategory, searchChannelQuery]);

  // Handle Send Message
  const handleSendMessage = async () => {
    if (!chatInput.trim() && attachmentFiles.length === 0) return;
    setIsSending(true);

    try {
      if (editingMessage) {
        editCommunityMessage(editingMessage.id, chatInput);
        setEditingMessage(null);
        setChatInput('');
        return;
      }

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

      await sendCommunityMessage({
        batchId: activeChannelId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: userRole as any,
        senderAvatar: profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`,
        messageText: chatInput.trim(),
        messageType: attachmentUrl ? 'file' : 'text',
        attachmentUrl,
        attachmentName,
        attachmentSize,
        replyToId: replyingTo?.id || '',
        replyToSenderName: replyingTo?.senderName || '',
        replyToText: replyingTo?.messageText || '',
        readBy: [currentUserId],
      });

      setChatInput('');
      setReplyingTo(null);
      setAttachmentFiles([]);
      setShowAttachmentPicker(false);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Post Smart Announcement
  const handlePostAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.text.trim()) return;
    setIsSending(true);
    try {
      await sendCommunityMessage({
        batchId: activeChannelId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: userRole as any,
        senderAvatar: profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`,
        messageText: announcementForm.text.trim(),
        messageType: 'announcement',
        announcementTitle: announcementForm.title.trim(),
        announcementDate: announcementForm.targetDate || new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        isPinned: true,
        readBy: [currentUserId],
      });
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', text: '', targetDate: '' });
    } finally {
      setIsSending(false);
    }
  };

  // Attachment downloader helper
  const handleDownloadAttachment = async (m: LmsCommunityMessage) => {
    if (m.attachmentUrl) {
      const a = document.createElement('a');
      a.href = m.attachmentUrl;
      a.download = m.attachmentName || 'attachment';
      a.click();
    } else {
      setFeedback({ kind: 'info', message: `Attachment ${m.attachmentName || ''} downloaded.` });
    }
  };

  // Member roster for active channel
  const channelMembers = useMemo(() => {
    if (activeChannelId === 'faculty_general') {
      return state.teachers.map((t) => ({ id: t.id, name: t.name, role: 'Teacher', avatar: t.avatar, online: true }));
    }
    const teachers = state.teachers.filter((t) => t.batchIds?.includes(activeChannelId) || true).slice(0, 2);
    const students = state.students.filter((s) => s.batchId === activeChannelId);
    return [
      ...teachers.map((t) => ({ id: t.id, name: t.name, role: 'Instructor', avatar: t.avatar, online: true })),
      ...students.map((s) => ({ id: s.id, name: s.name, role: 'Student', avatar: s.avatar, online: onlineStudentIds.includes(s.id) })),
    ];
  }, [activeChannelId, state.teachers, state.students, onlineStudentIds]);

  const onlineMembersCount = useMemo(() => channelMembers.filter((m) => m.online).length, [channelMembers]);

  // --------------------------------------------------------------------------
  // FORUM Q&A FILTERED POSTS
  // --------------------------------------------------------------------------
  const accessiblePosts = useMemo(() => {
    const all = state.communityPosts || [];
    if (isAdminUser) return all;

    if (currentUserRole === 'student') {
      const studentObj = state.students.find((s) => s.id === currentUserId || (user?.email && s.email.toLowerCase() === user.email.toLowerCase()));
      const studentBatchId = studentObj?.batchId || 'batch_001';
      return all.filter((p) => !p.isHidden && (!p.batchId || p.batchId === studentBatchId));
    }

    if (currentUserRole === 'teacher') {
      const teacherObj = state.teachers.find((t) => t.id === currentUserId || (user?.email && t.email.toLowerCase() === user.email.toLowerCase()));
      const teacherBatches = teacherObj?.batchIds || state.batches.map((b) => b.id);
      return all.filter((p) => !p.isHidden && (!p.batchId || teacherBatches.includes(p.batchId)));
    }

    return all;
  }, [state.communityPosts, isAdminUser, currentUserRole, currentUserId, user?.email, state.students, state.teachers, state.batches]);

  const filteredPosts = useMemo(() => {
    let posts = [...accessiblePosts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'All') {
      posts = posts.filter((p) => p.category === categoryFilter);
    }

    if (selectedTopic) {
      const tagQuery = selectedTopic.replace('#', '').toLowerCase();
      posts = posts.filter((p) => (p.tags || []).some((t) => t.toLowerCase().includes(tagQuery)));
    }

    if (mySpaceFilter === 'my_posts') posts = posts.filter((p) => p.authorId === currentUserId);
    else if (mySpaceFilter === 'my_answers') {
      const myAnswerPostIds = (state.communityAnswers || []).filter((a) => a.authorId === currentUserId).map((a) => a.postId);
      posts = posts.filter((p) => myAnswerPostIds.includes(p.id));
    } else if (mySpaceFilter === 'saved') {
      const bookmarkedIds = (state.communityBookmarks || []).filter((b) => b.userId === currentUserId).map((b) => b.postId);
      posts = posts.filter((p) => bookmarkedIds.includes(p.id));
    }

    switch (discoverFilter) {
      case 'latest':
        return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'popular':
        return posts.sort((a, b) => b.upvotesCount + b.answersCount - (a.upvotesCount + a.answersCount));
      case 'unanswered':
        return posts.filter((p) => p.answersCount === 0);
      case 'solved':
        return posts.filter((p) => p.isSolved);
      default:
        return posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }
  }, [accessiblePosts, searchQuery, categoryFilter, selectedTopic, mySpaceFilter, discoverFilter, currentUserId, state.communityAnswers, state.communityBookmarks]);

  const adminStats = useMemo(() => {
    const posts = state.communityPosts || [];
    return {
      totalPosts: posts.length,
      solvedQuestions: posts.filter((p) => p.isSolved).length,
      unansweredQuestions: posts.filter((p) => p.answersCount === 0).length,
      totalAnswers: (state.communityAnswers || []).length,
    };
  }, [state.communityPosts, state.communityAnswers]);

  return (
    <div className="space-y-4">
      {/* PAGE HEADER & TOP NAVIGATION TABS */}
      <PageHeader
        title="Community & Live Channels"
        subtitle="Real-time batch messaging, announcements & academic discussion forum"
        actions={
          activeTab === 'chat' && (isTeacher || isAdminUser) ? (
            <button onClick={() => setShowAnnouncementModal(true)} className="btn-primary flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Post Smart Announcement
            </button>
          ) : (
            <button onClick={() => { setAskModalInitialType('question'); setShowAskModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ask Question / Start Discussion
            </button>
          )
        }
      />

      {/* TOP COMMUNITY METRICS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">Active Channels</p>
            <p className="text-lg font-bold text-ink-900">{allChannels.length}</p>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 text-success-600 flex items-center justify-center font-bold">
            <Circle className="w-3.5 h-3.5 fill-success-500 text-success-500 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">Members Online</p>
            <p className="text-lg font-bold text-ink-900">{onlineStudentIds.length + 4} Active</p>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">Unread Messages</p>
            <p className="text-lg font-bold text-ink-900">{totalUnread} Unread</p>
          </div>
        </Card>

        <Card className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-400 font-medium">Announcements</p>
            <p className="text-lg font-bold text-ink-900">
              {(state.communityMessages || []).filter((m) => m.messageType === 'announcement').length} Active
            </p>
          </div>
        </Card>
      </div>

      {/* MAIN NAVIGATION TABS */}
      <div className="flex border-b border-ink-100 gap-6">
        <button
          onClick={() => setActiveTab('chat')}
          className={cn('pb-3 text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'chat' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-500 hover:text-ink-800')}
        >
          <MessageSquare className="w-4 h-4" /> Live Batch Channels
          {totalUnread > 0 && <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{totalUnread}</span>}
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={cn('pb-3 text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'feed' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-500 hover:text-ink-800')}
        >
          <HelpCircle className="w-4 h-4" /> Q&A Discussion Forum
        </button>

        {isAdminUser && (
          <>
            <button
              onClick={() => setActiveTab('admin_moderation')}
              className={cn('pb-3 text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'admin_moderation' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-500 hover:text-ink-800')}
            >
              <ShieldAlert className="w-4 h-4 text-warning-600" /> Moderation Panel
            </button>
            <button
              onClick={() => setActiveTab('admin_analytics')}
              className={cn('pb-3 text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px', activeTab === 'admin_analytics' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-500 hover:text-ink-800')}
            >
              <BarChart2 className="w-4 h-4 text-accent-600" /> Analytics
            </button>
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 1. REAL-TIME BATCH CHANNELS & LIVE CHAT VIEW                        */}
      {/* ==================================================================== */}
      {activeTab === 'chat' && (
        <div className="grid lg:grid-cols-12 gap-4 h-[720px] max-h-[80vh]">
          {/* LEFT SIDEBAR — CHANNELS LIST */}
          <Card className="lg:col-span-3 flex flex-col p-3 overflow-hidden bg-white">
            <div className="space-y-2 pb-3 border-b border-ink-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={searchChannelQuery}
                  onChange={(e) => setSearchChannelQuery(e.target.value)}
                  className="input pl-8 py-1.5 text-xs w-full"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
                {(['all', 'batches', 'announcements', 'faculty'] as ChannelCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setChannelCategory(cat)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[11px] font-semibold capitalize whitespace-nowrap transition',
                      channelCategory === cat ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 py-2 scrollbar-thin">
              {filteredChannels.map((c) => {
                const isActive = c.id === activeChannelId;
                const unreadCount = unreadPerChannel[c.id] || 0;
                const Icon = c.icon || Users;

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannelId(c.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-xl transition text-left relative group',
                      isActive ? 'bg-primary-50 text-primary-900 font-semibold shadow-sm' : 'hover:bg-ink-50 text-ink-700'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition',
                      c.type === 'announcements' ? 'bg-warning-100 text-warning-700' : isActive ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold truncate">{c.name}</p>
                        {unreadCount > 0 && (
                          <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-400 truncate mt-0.5">{c.memberCount} members · 🟢 Active</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* MAIN CHAT WORKSPACE */}
          <Card className={cn('flex flex-col overflow-hidden bg-white', showChannelInfo ? 'lg:col-span-6' : 'lg:col-span-9')}>
            {/* CHAT HEADER */}
            <div className="p-3 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink-900 truncate">{activeChannel.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
                      <Circle className="w-2 h-2 fill-success-500 text-success-500" />
                      {onlineMembersCount} Online
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 truncate">{activeChannel.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={cn('p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition', showChatSearch && 'bg-primary-50 text-primary-600')}
                  title="Search messages"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={cn('p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition relative', showPinnedOnly && 'bg-primary-50 text-primary-600')}
                  title="Pinned messages"
                >
                  <Pin className="w-4 h-4" />
                  {pinnedMessages.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-warning-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setShowChannelInfo(!showChannelInfo)}
                  className={cn('p-2 rounded-lg text-ink-500 hover:bg-ink-100 transition', showChannelInfo && 'bg-primary-50 text-primary-600')}
                  title="Channel Information"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SEARCH MESSAGES BAR */}
            {showChatSearch && (
              <div className="p-2 bg-ink-50 border-b border-ink-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-ink-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search in this channel..."
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                  className="input text-xs py-1 flex-1 bg-white"
                  autoFocus
                />
                {chatSearchTerm && (
                  <button onClick={() => setChatSearchTerm('')} className="text-xs text-ink-400 hover:text-ink-700 px-2">Clear</button>
                )}
              </div>
            )}

            {/* EXPANDABLE PINNED MESSAGES BANNER */}
            {pinnedMessages.length > 0 && !showPinnedOnly && (
              <div className="bg-warning-50/70 border-b border-warning-100 px-4 py-2 flex items-center justify-between text-xs text-warning-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Pin className="w-3.5 h-3.5 text-warning-600 shrink-0" />
                  <span className="font-semibold shrink-0">Pinned ({pinnedMessages.length}):</span>
                  <span className="truncate">{pinnedMessages[pinnedMessages.length - 1].messageText}</span>
                </div>
                <button onClick={() => setShowPinnedOnly(true)} className="text-[11px] font-bold text-warning-700 hover:underline shrink-0 ml-2">View All</button>
              </div>
            )}

            {/* CHAT MESSAGES STREAM */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin bg-ink-50/30">
              {activeChannelMessages.length > 0 ? (
                activeChannelMessages.map((m, index) => {
                  const isMe = m.senderId === currentUserId;
                  const isTeacherMsg = m.senderRole === 'teacher' || m.senderRole === 'admin';
                  const isAnnouncement = m.messageType === 'announcement';
                  const isRead = m.readBy && m.readBy.length > 1;

                  return (
                    <div key={m.id} className="space-y-1 group">
                      {/* SMART ANNOUNCEMENT CARD */}
                      {isAnnouncement ? (
                        <div className="my-3 p-4 rounded-2xl bg-gradient-to-r from-warning-50 via-amber-50 to-primary-50 border-2 border-warning-300 shadow-sm relative">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-warning-500 text-white flex items-center justify-center font-bold shrink-0">
                                <Megaphone className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-warning-700 bg-warning-200/60 px-2 py-0.5 rounded-md">
                                  Official Announcement
                                </span>
                                <h4 className="text-sm font-bold text-ink-900 mt-0.5">{m.announcementTitle || 'Announcement'}</h4>
                              </div>
                            </div>
                            <span className="text-[10px] text-ink-400">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <p className="text-xs text-ink-800 mt-2 whitespace-pre-wrap leading-relaxed">{m.messageText}</p>

                          {m.announcementDate && (
                            <div className="mt-2 text-xs font-semibold text-warning-800 flex items-center gap-1.5 bg-white/80 p-2 rounded-lg border border-warning-200 w-fit">
                              <Clock className="w-3.5 h-3.5 text-warning-600" /> Target Date: {m.announcementDate}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-warning-200/60 pt-2 text-[11px] text-ink-500">
                            <span>Posted by {m.senderName}</span>
                            <button
                              onClick={() => markCommunityChannelAsRead(m.batchId, currentUserId)}
                              className="btn-ghost py-1 px-2.5 text-xs text-primary-700 font-bold hover:bg-white"
                            >
                              <CheckCheck className="w-3.5 h-3.5" /> Mark as Read
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* STANDARD CHAT BUBBLE */
                        <div className={cn('flex items-start gap-2.5 max-w-[85%]', isMe ? 'ml-auto flex-row-reverse' : '')}>
                          <img
                            src={m.senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.senderName)}`}
                            alt={m.senderName}
                            className="w-8 h-8 rounded-xl object-cover bg-ink-100 shrink-0 mt-1"
                          />

                          <div className="space-y-1 min-w-0">
                            <div className={cn('flex items-center gap-2 text-xs text-ink-400', isMe ? 'justify-end' : '')}>
                              <span className="font-semibold text-ink-800 truncate">{m.senderName}</span>
                              {isTeacherMsg && <Badge variant="primary" size="sm">Instructor</Badge>}
                              <span className="text-[10px]">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* QUOTED REPLY PREVIEW */}
                            {m.replyToText && (
                              <div className="p-2 rounded-xl bg-ink-100/70 text-xs border-l-2 border-primary-500 text-ink-700 font-medium line-clamp-2">
                                <span className="font-bold text-primary-700 block text-[10px]">Replying to {m.replyToSenderName || 'message'}:</span>
                                {m.replyToText}
                              </div>
                            )}

                            <div className={cn(
                              'p-3 rounded-2xl text-xs relative leading-relaxed shadow-sm',
                              isMe ? 'bg-primary-600 text-white rounded-tr-none' : isTeacherMsg ? 'bg-primary-50 text-ink-900 border border-primary-100 rounded-tl-none' : 'bg-white text-ink-900 border border-ink-100 rounded-tl-none'
                            )}>
                              <p className="whitespace-pre-wrap">{m.messageText}</p>

                              {/* ATTACHMENT CARD */}
                              {m.attachmentName && (
                                <div className={cn('mt-2 p-2 rounded-xl border flex items-center justify-between gap-2', isMe ? 'bg-primary-700/60 border-primary-500 text-white' : 'bg-ink-50 border-ink-200 text-ink-800')}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-semibold truncate text-[11px]">{m.attachmentName}</p>
                                      {m.attachmentSize && <p className="text-[9px] opacity-75">{m.attachmentSize}</p>}
                                    </div>
                                  </div>
                                  <button onClick={() => void handleDownloadAttachment(m)} className="p-1 hover:opacity-80 transition" title="Download attachment">
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* MESSAGE ACTION BUTTONS ON HOVER */}
                              <div className={cn(
                                'absolute top-2 hidden group-hover:flex items-center gap-1 bg-white border border-ink-200 rounded-lg p-0.5 shadow-md z-10 text-ink-600',
                                isMe ? '-left-24' : '-right-24'
                              )}>
                                <button onClick={() => setReplyingTo(m)} className="p-1 hover:bg-ink-100 rounded" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)} className="p-1 hover:bg-ink-100 rounded" title="React"><Smile className="w-3.5 h-3.5" /></button>
                                {(isTeacher || isAdminUser) && (
                                  <button onClick={() => void pinCommunityMessage(m.id, !m.isPinned)} className="p-1 hover:bg-ink-100 rounded" title={m.isPinned ? 'Unpin' : 'Pin'}>
                                    {m.isPinned ? <PinOff className="w-3.5 h-3.5 text-warning-600" /> : <Pin className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {(isMe || isAdminUser) && (
                                  <>
                                    {isMe && <button onClick={() => { setEditingMessage(m); setChatInput(m.messageText); }} className="p-1 hover:bg-ink-100 rounded" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                                    <button onClick={() => void deleteCommunityMessage(m.id)} className="p-1 hover:bg-error-50 text-error-600 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </>
                                )}
                              </div>

                              {/* QUICK EMOJI REACTION POPUP */}
                              {showEmojiPicker === m.id && (
                                <div className="absolute -top-10 left-0 bg-white border border-ink-200 rounded-xl p-1.5 shadow-pop flex gap-1.5 z-20">
                                  {EMOJI_LIST.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => { toggleMessageReaction(m.id, emoji, currentUserId); setShowEmojiPicker(null); }}
                                      className="hover:scale-125 transition text-sm p-1"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* REACTION PILLS */}
                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                              <div className={cn('flex flex-wrap gap-1 mt-1', isMe ? 'justify-end' : '')}>
                                {Object.entries(m.reactions).map(([emoji, users]) => {
                                  const hasReacted = users.includes(currentUserId);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleMessageReaction(m.id, emoji, currentUserId)}
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition',
                                        hasReacted ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'
                                      )}
                                    >
                                      <span>{emoji}</span>
                                      <span>{users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* READ STATUS FOR OWN MESSAGES */}
                            {isMe && (
                              <div className="flex justify-end text-[10px] text-ink-400 items-center gap-1">
                                {isRead ? <CheckCheck className="w-3 h-3 text-primary-600" /> : <Check className="w-3 h-3" />}
                                <span>{isRead ? 'Read' : 'Sent'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-400 space-y-2">
                  <MessageSquare className="w-10 h-10 text-ink-300 stroke-1" />
                  <p className="font-semibold text-ink-700">No messages in this channel yet</p>
                  <p className="text-xs max-w-sm">Start the conversation with your instructor and batch peers!</p>
                </div>
              )}
            </div>

            {/* TYPING INDICATOR */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1 bg-ink-50 text-[11px] text-ink-500 italic flex items-center gap-1.5 border-t border-ink-100">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-ping" />
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}

            {/* CHAT INPUT COMPOSER */}
            <div className="p-3 border-t border-ink-100 bg-white space-y-2">
              {/* REPLYING TO BANNER */}
              {replyingTo && (
                <div className="p-2 rounded-xl bg-primary-50 text-xs border-l-2 border-primary-600 flex items-center justify-between text-primary-900">
                  <div className="min-w-0">
                    <span className="font-bold text-[10px] block">Replying to {replyingTo.senderName}:</span>
                    <span className="truncate block opacity-90">{replyingTo.messageText}</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-ink-400 hover:text-ink-700 p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {/* EDITING MESSAGE BANNER */}
              {editingMessage && (
                <div className="p-2 rounded-xl bg-warning-50 text-xs border-l-2 border-warning-600 flex items-center justify-between text-warning-900">
                  <span className="font-bold">Editing message...</span>
                  <button onClick={() => { setEditingMessage(null); setChatInput(''); }} className="text-ink-400 hover:text-ink-700 p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {/* ATTACHMENT PICKER MODAL/PANEL */}
              {showAttachmentPicker && (
                <div className="p-3 border border-ink-200 rounded-xl bg-ink-50 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-ink-700">
                    <span>Attach document or image</span>
                    <button onClick={() => setShowAttachmentPicker(false)} className="text-ink-400 hover:text-ink-700"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <FileAttachmentPicker ownerId="community-chat" ownerType="note" files={attachmentFiles} onChange={setAttachmentFiles} label="Select file" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                  className="p-2 text-ink-400 hover:text-primary-600 hover:bg-ink-100 rounded-xl transition"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  value={chatInput}
                  onChange={(e) => { setChatInput(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${activeChannel.name}... (Press Enter to send)`}
                  className="input flex-1 py-2 text-xs min-h-[38px] max-h-24 resize-none"
                  rows={1}
                />

                <button
                  onClick={() => void handleSendMessage()}
                  disabled={isSending || (!chatInput.trim() && attachmentFiles.length === 0)}
                  className="btn-primary p-2.5 rounded-xl shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </Card>

          {/* RIGHT SIDE PANEL — CHANNEL INFORMATION & ROSTER */}
          {showChannelInfo && (
            <Card className="lg:col-span-3 flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-thin bg-white">
              <div className="flex justify-between items-center border-b border-ink-100 pb-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-ink-400">Channel Details</h4>
                <button onClick={() => setShowChannelInfo(false)} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
              </div>

              <div>
                <h3 className="font-bold text-sm text-ink-900">{activeChannel.name}</h3>
                <p className="text-xs text-ink-500 mt-1">{activeChannel.description}</p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="primary">{channelMembers.length} Members</Badge>
                  <Badge variant="success">{onlineMembersCount} Online</Badge>
                </div>
              </div>

              {/* PINNED MESSAGES LIST */}
              <div className="border-t border-ink-100 pt-3 space-y-2">
                <h5 className="font-bold text-xs text-ink-800 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-warning-600" /> Pinned Notices ({pinnedMessages.length})
                </h5>
                {pinnedMessages.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {pinnedMessages.map((pm) => (
                      <div key={pm.id} className="p-2 rounded-xl bg-warning-50/60 border border-warning-200 text-xs text-ink-800">
                        <p className="font-semibold text-warning-900 truncate">{pm.announcementTitle || pm.senderName}</p>
                        <p className="line-clamp-2 mt-0.5 text-[11px]">{pm.messageText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 italic">No pinned messages yet.</p>
                )}
              </div>

              {/* ENROLLED MEMBER ROSTER */}
              <div className="border-t border-ink-100 pt-3 space-y-2 flex-1">
                <h5 className="font-bold text-xs text-ink-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary-600" /> Member Roster
                </h5>
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                  {channelMembers.map((mem) => (
                    <div key={mem.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-ink-50 transition">
                      <div className="relative">
                        <img src={mem.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mem.name)}`} alt={mem.name} className="w-7 h-7 rounded-full bg-ink-100 object-cover" />
                        <span className={cn('absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white', mem.online ? 'bg-success-500' : 'bg-ink-300')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink-800 truncate">{mem.name}</p>
                        <p className="text-[10px] text-ink-400">{mem.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FORUM Q&A DISCUSSION FEED TAB                                     */}
      {/* ==================================================================== */}
      {activeTab === 'feed' && (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* SEARCH & FILTERS BAR */}
            <Card className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions, topics, code snippets, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 text-sm w-full"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['for_you', 'latest', 'popular', 'unanswered', 'solved'] as DiscoverFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setDiscoverFilter(f)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                        discoverFilter === f ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                  >
                    <option value="All">All Categories</option>
                    <option value="General">General</option>
                    <option value="Assignments">Assignments</option>
                    <option value="Exams">Exams</option>
                    <option value="Projects">Projects</option>
                    <option value="Career">Career & Placements</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* POSTS LIST */}
            <div className="space-y-4">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <DiscussionCard
                    key={post.id}
                    post={post}
                    answers={(state.communityAnswers || []).filter((a) => a.postId === post.id)}
                    onOpenDetail={(p) => setSelectedDetailPost(p)}
                    onOpenProfile={(id, name, role, avatar) => setSelectedUserProfile({ id, name, role, avatar })}
                    onOpenReport={(targetType, targetId, postId) => setSelectedReportTarget({ targetType, targetId, postId })}
                  />
                ))
              ) : (
                <Card className="p-8 text-center text-slate-500">
                  <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800">No discussions match your filter</h3>
                  <p className="text-xs text-slate-400 mt-1">Be the first to start a conversation in this topic!</p>
                </Card>
              )}
            </div>
          </div>

          {/* SIDEBAR — TRENDING TOPICS */}
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Trending Topics</h4>
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTopic(selectedTopic === tag ? null : tag)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      selectedTopic === tag ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. ADMIN MODERATION TAB                                              */}
      {/* ==================================================================== */}
      {activeTab === 'admin_moderation' && isAdminUser && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-ink-900 text-sm">Community Moderation Center</h3>
            <p className="text-xs text-ink-500 mt-1">Review flagged questions, answers, or inappropriate messages reported by users.</p>
            <div className="mt-4 p-6 text-center text-ink-400 border border-dashed border-ink-200 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-success-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-ink-700">No pending content reports</p>
              <p className="text-[11px] text-ink-400">All community channels are compliant with institution guidelines.</p>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ADMIN ANALYTICS TAB                                               */}
      {/* ==================================================================== */}
      {activeTab === 'admin_analytics' && isAdminUser && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Posts</span>
              <p className="text-2xl font-black text-slate-900">{adminStats.totalPosts}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Solved Questions</span>
              <p className="text-2xl font-black text-emerald-600">{adminStats.solvedQuestions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unanswered</span>
              <p className="text-2xl font-black text-amber-600">{adminStats.unansweredQuestions}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Answers</span>
              <p className="text-2xl font-black text-indigo-600">{adminStats.totalAnswers}</p>
            </div>
          </div>
        </div>
      )}

      {/* SMART ANNOUNCEMENT MODAL */}
      <Modal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} title="Post Smart Announcement" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Announcement Title *</label>
            <input
              className="input"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              placeholder="e.g. Data Structures Mid-Semester Exam Schedule"
            />
          </div>

          <div>
            <label className="label">Target Date / Venue (Optional)</label>
            <input
              className="input"
              value={announcementForm.targetDate}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, targetDate: e.target.value })}
              placeholder="e.g. Friday, 10:00 AM · Room C-204"
            />
          </div>

          <div>
            <label className="label">Announcement Details *</label>
            <textarea
              className="input min-h-24"
              value={announcementForm.text}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
              placeholder="Write official announcement notice..."
            />
          </div>

          <button
            onClick={() => void handlePostAnnouncement()}
            disabled={isSending || !announcementForm.title.trim() || !announcementForm.text.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            {isSending ? 'Publishing Announcement...' : 'Publish Smart Announcement'}
          </button>
        </div>
      </Modal>

      {/* FORUM MODALS */}
      <AskQuestionModal open={showAskModal} onClose={() => setShowAskModal(false)} initialPostType={askModalInitialType} />
      <QuestionDetailModal
        post={selectedDetailPost}
        onClose={() => setSelectedDetailPost(null)}
        onOpenProfile={(id, name, role, avatar) => setSelectedUserProfile({ id, name, role, avatar })}
        onOpenReport={(targetType, targetId, postId) => setSelectedReportTarget({ targetType, targetId, postId })}
      />
      <UserProfileModal user={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />
      <ReportModal target={selectedReportTarget} onClose={() => setSelectedReportTarget(null)} />
    </div>
  );
}
