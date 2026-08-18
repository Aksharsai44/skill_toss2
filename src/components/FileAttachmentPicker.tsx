import { useRef, useState } from 'react';
import { FileText, Paperclip, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SubmissionAttachment } from '@/lib/types';
import { ACCEPTED_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS, formatAttachmentSize, attachmentExtension, attachmentIdFor } from '@/lib/attachmentConfig';

export type PickedAttachment = { metadata: SubmissionAttachment; file?: File };

export function FileAttachmentPicker({ ownerId, ownerType, files, onChange, label = 'Files', maxFiles = MAX_ATTACHMENTS }: { ownerId: string; ownerType: SubmissionAttachment['ownerType']; files: PickedAttachment[]; onChange: (files: PickedAttachment[]) => void; label?: string; maxFiles?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files]; setError('');
    for (const file of Array.from(incoming)) {
      const extension = attachmentExtension(file.name);
      if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(extension)) { setError(`${file.name}: This file type is not supported.`); continue; }
      if (file.size > MAX_ATTACHMENT_SIZE) { setError(`${file.name} exceeds the 10 MB size limit.`); continue; }
      const id = attachmentIdFor(ownerId, ownerType || 'attachment', file);
      if (next.some((entry) => entry.metadata.id === id)) { setError(`${file.name} is already attached.`); continue; }
      if (next.length >= maxFiles) { setError(`You can attach up to ${maxFiles} files.`); break; }
      next.push({ metadata: { id, submissionId: ownerId, fileName: file.name, fileType: file.type || extension.toUpperCase(), fileSize: file.size, lastModified: file.lastModified, storageMode: 'local', createdAt: new Date().toISOString(), ownerType, ownerId }, file });
    }
    onChange(next);
  };
  return <div><label className="label">{label}</label><div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} className={cn('rounded-xl border-2 border-dashed p-4 text-center', dragging ? 'border-primary-500 bg-primary-50' : 'border-ink-200 bg-ink-50/50')}><UploadCloud className="w-5 h-5 mx-auto text-primary-600" /><p className="mt-1 text-sm text-ink-700">Drop files here or choose files</p><input ref={inputRef} type="file" multiple className="sr-only" aria-label={`Choose ${label}`} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,image/*" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} /><button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary mt-2 text-xs"><Paperclip className="w-3.5 h-3.5" /> Choose Files</button><p className="mt-2 text-[11px] text-ink-400">PDF, DOCX, PPTX, XLSX, TXT, ZIP, JPG, PNG · 10 MB each</p></div>{error && <p role="alert" className="mt-2 text-xs text-error-600">{error}</p>}{files.length > 0 && <div className="mt-3 space-y-2">{files.map((entry) => <div key={entry.metadata.id} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2"><FileText className="w-4 h-4 text-primary-600" /><span className="min-w-0 flex-1 truncate text-sm" title={entry.metadata.fileName}>{entry.metadata.fileName}<span className="block text-[11px] text-ink-400">{formatAttachmentSize(entry.metadata.fileSize)} · {attachmentExtension(entry.metadata.fileName).toUpperCase()}</span></span><button type="button" onClick={() => onChange(files.filter((item) => item.metadata.id !== entry.metadata.id))} className="btn-ghost p-1 text-error-600" aria-label={`Remove ${entry.metadata.fileName}`}><X className="w-4 h-4" /></button></div>)}</div>}</div>;
}
