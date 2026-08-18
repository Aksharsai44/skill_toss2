export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ACCEPTED_ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'jpg', 'jpeg', 'png'];
export const formatAttachmentSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
export const attachmentExtension = (name: string) => name.toLowerCase().split('.').pop() || '';
export const attachmentIdFor = (ownerId: string, ownerType: string, file: Pick<File, 'name' | 'size' | 'lastModified'>) => `attachment_${ownerType}_${ownerId}_${file.name}_${file.size}_${file.lastModified}`.replace(/[^a-zA-Z0-9_-]/g, '_');
