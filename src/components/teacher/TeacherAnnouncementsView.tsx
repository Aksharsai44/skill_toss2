import { useState, useMemo } from 'react';
import { Bell, Plus, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { PageHeader, Card, EmptyState } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';

export function TeacherAnnouncementsView() {
  const { user, profile } = useAuth();
  const { state, sendBatchAnnouncement, setFeedback } = useLmsData();

  // Find active teacher profile
  const teacher = useMemo(() => {
    return (
      state.teachers.find(
        (t) =>
          t.id === profile?.id ||
          (user?.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
          (profile?.fullName && t.name.toLowerCase() === profile.fullName.toLowerCase())
      ) ||
      state.teachers.find((t) => t.id === 'teacher_001') ||
      state.teachers[0]
    );
  }, [profile, user, state.teachers]);

  const batchIds = useMemo(() => teacher?.batchIds || state.batches.map((b) => b.id), [teacher, state.batches]);
  const teacherBatches = useMemo(() => state.batches.filter((b) => batchIds.includes(b.id) || b.teacherId === teacher?.id), [state.batches, batchIds, teacher]);
  const teacherName = teacher?.name || profile?.fullName || 'Faculty Member';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(teacherBatches[0]?.id || 'batch_001');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementAttachments, setAnnouncementAttachments] = useState<PickedAttachment[]>([]);

  // Filter announcements for teacher's assigned batches
  const announcementsList = useMemo(() => {
    const assignedIds = new Set(teacherBatches.map((b) => b.id));
    return (state.communityMessages || [])
      .filter((msg) => msg.messageType === 'announcement')
      .filter(
        (msg) => assignedIds.has(msg.batchId) || msg.senderName === teacherName || msg.batchId === 'all'
      );
  }, [state.communityMessages, teacherBatches, teacherName]);

  const handlePostAnnouncement = async () => {
    if (!selectedBatchId || !announcementTitle.trim() || !announcementContent.trim()) return;
    sendBatchAnnouncement(selectedBatchId, announcementTitle.trim(), announcementContent.trim(), teacherName);
    
    // Sync announcement to backend API
    const { teacherService } = await import('@/services/teacherService');
    await teacherService.createAnnouncementAsync(
      announcementTitle.trim(),
      announcementContent.trim(),
      selectedBatchId,
      teacher?.id || 'teacher_001'
    );

    setAnnouncementTitle('');
    setAnnouncementContent('');
    setAnnouncementAttachments([]);
    setShowCreateModal(false);
    setFeedback({ kind: 'success', message: 'Announcement successfully posted to batch!' });
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Batch Announcements"
        subtitle="Broadcast announcements, guidelines and real-time updates to students."
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs">
            <Plus className="w-4 h-4" /> Create Announcement
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcementsList.length > 0 ? (
          announcementsList.map((ann) => {
            const batch = state.batches.find((b) => b.id === ann.batchId);
            return (
              <Card key={ann.id} hover className="p-5 flex flex-col justify-between border-ink-200/80 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200/60">
                      {batch?.name || ann.batchId || 'All Students'}
                    </span>
                    <Badge variant="success" size="sm">Published</Badge>
                  </div>
                  <h4 className="font-bold text-ink-900 text-sm mb-1">{ann.announcementTitle || 'Announcement'}</h4>
                  <p className="text-xs text-ink-600 line-clamp-3 mb-4 leading-relaxed">{ann.messageText}</p>
                </div>
                <div className="pt-3 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-400">
                  <span className="font-medium">{ann.senderName || teacherName}</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Bell}
            title="No announcements posted yet"
            description="Broadcast important announcements to your assigned batches."
            action={
              <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs py-2 px-4">
                Post First Announcement
              </button>
            }
          />
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Batch Announcement" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Target Audience / Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="input text-xs"
            >
              {teacherBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Announcement Title</label>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="e.g. Mid-Semester Lab Exam Guidelines"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label">Message Content</label>
            <textarea
              rows={4}
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              placeholder="Provide details for students..."
              className="input text-xs"
            />
          </div>

          <FileAttachmentPicker
            ownerId={`announcement_${Date.now()}`}
            ownerType="resource"
            files={announcementAttachments}
            onChange={setAnnouncementAttachments}
            label="Attachments (Optional)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handlePostAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim()}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" /> Post Announcement
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
