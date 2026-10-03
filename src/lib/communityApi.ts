import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';

function assertSuccess(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listAnnouncements(batchId?: string) {
  let query = supabase.from('announcements').select('*').order('published_at', { ascending: false });
  if (batchId) query = query.or(`batch_id.is.null,batch_id.eq.${batchId}`);
  const { data, error } = await query;
  assertSuccess(error);
  return data ?? [];
}

export async function publishAnnouncement(input: {
  institutionId: string;
  batchId?: string;
  title: string;
  body: string;
  audienceRoles: Exclude<UserRole, 'product_admin'>[];
}) {
  const { data, error } = await supabase.from('announcements').insert({
    institution_id: input.institutionId,
    batch_id: input.batchId ?? null,
    title: input.title.trim(),
    body: input.body.trim(),
    audience_roles: input.audienceRoles,
  }).select('*').single();
  assertSuccess(error);
  return data;
}

export async function listCommunityPosts(batchId: string) {
  const { data, error } = await supabase.from('community_posts')
    .select('*, community_comments(*)').eq('batch_id', batchId).order('created_at', { ascending: false });
  assertSuccess(error);
  return data ?? [];
}

export async function createCommunityPost(input: { institutionId: string; batchId: string; content: string }) {
  const { data, error } = await supabase.from('community_posts').insert({
    institution_id: input.institutionId,
    batch_id: input.batchId,
    content: input.content.trim(),
  }).select('*').single();
  assertSuccess(error);
  return data;
}

export async function addCommunityComment(input: { institutionId: string; postId: string; content: string }) {
  const { data, error } = await supabase.from('community_comments').insert({
    institution_id: input.institutionId,
    post_id: input.postId,
    content: input.content.trim(),
  }).select('*').single();
  assertSuccess(error);
  return data;
}

export async function moderateCommunityItem(table: 'community_posts' | 'community_comments', id: string, hidden: boolean) {
  const { error } = await supabase.from(table).update({ status: hidden ? 'hidden' : 'active' }).eq('id', id);
  assertSuccess(error);
}
