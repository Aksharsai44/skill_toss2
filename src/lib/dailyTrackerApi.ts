import { supabase } from '@/lib/supabase';

export type DailyGoal = {
  id: string;
  institution_id: string;
  student_id: string;
  title: string;
  category: string;
  target: string;
  target_date: string | null;
  status: 'active' | 'completed' | 'archived';
  completed_at: string | null;
};

export type DailyTask = {
  id: string;
  institution_id: string;
  student_id: string;
  goal_id: string | null;
  activity_date: string;
  title: string;
  status: 'pending' | 'completed';
  completed_at: string | null;
};

function assertSuccess(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listDailyGoals(studentId: string) {
  const { data, error } = await supabase.from('daily_goals')
    .select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  assertSuccess(error);
  return (data ?? []) as DailyGoal[];
}

export async function saveDailyGoal(input: {
  id?: string;
  institutionId: string;
  studentId: string;
  title: string;
  category: string;
  target: string;
  targetDate?: string;
  status?: DailyGoal['status'];
}) {
  const payload = {
    institution_id: input.institutionId,
    student_id: input.studentId,
    title: input.title.trim(),
    category: input.category.trim(),
    target: input.target.trim(),
    target_date: input.targetDate || null,
    status: input.status ?? 'active',
  };
  const query = input.id
    ? supabase.from('daily_goals').update(payload).eq('id', input.id)
    : supabase.from('daily_goals').insert(payload);
  const { data, error } = await query.select('*').single();
  assertSuccess(error);
  if (!data) throw new Error('Supabase did not return the daily goal.');
  return data as DailyGoal;
}

export async function listDailyTasks(studentId: string, date?: string) {
  let query = supabase.from('daily_tasks').select('*').eq('student_id', studentId)
    .order('activity_date', { ascending: false });
  if (date) query = query.eq('activity_date', date);
  const { data, error } = await query;
  assertSuccess(error);
  return (data ?? []) as DailyTask[];
}

export async function saveDailyTask(input: {
  id?: string;
  institutionId: string;
  studentId: string;
  goalId?: string;
  activityDate: string;
  title: string;
  status?: DailyTask['status'];
}) {
  const payload = {
    institution_id: input.institutionId,
    student_id: input.studentId,
    goal_id: input.goalId ?? null,
    activity_date: input.activityDate,
    title: input.title.trim(),
    status: input.status ?? 'pending',
  };
  const query = input.id
    ? supabase.from('daily_tasks').update(payload).eq('id', input.id)
    : supabase.from('daily_tasks').insert(payload);
  const { data, error } = await query.select('*').single();
  assertSuccess(error);
  if (!data) throw new Error('Supabase did not return the daily task.');
  return data as DailyTask;
}

export async function listDailyActivity(studentId: string) {
  const { data, error } = await supabase.from('daily_activity_events')
    .select('*').eq('student_id', studentId).order('occurred_at', { ascending: false });
  assertSuccess(error);
  return data ?? [];
}
