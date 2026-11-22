
import { NextRequest, NextResponse } from 'next/server';
import { authError, requireWorkspaceUser, requireAdminSession } from '@/lib/workspace-auth';

export const runtime = 'nodejs';
const adminRoles = ['founder_admin', 'admin'];

export async function GET(request: NextRequest) {
  try {
    const { profile, supabase } = await requireWorkspaceUser(request);
    const type = request.nextUrl.searchParams.get('type') || 'tasks';

    if (type === 'tasks') {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(id,full_name,email), assigner:profiles!tasks_assigned_by_fkey(id,full_name,email)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      const ids = (tasks || []).map(t => t.id);
      const { data: audiences } = ids.length
        ? await supabase.from('task_audience').select('task_id,employee_id').in('task_id', ids)
        : { data: [] };

      const visible = (tasks || []).filter(t =>
        t.assigned_to === profile.id ||
        t.assigned_by === profile.id ||
        t.visibility === 'company' ||
        (t.visibility === 'department' && profile.department_id && t.department_id === profile.department_id) ||
        (t.visibility === 'selected' && (audiences || []).some(a => a.task_id === t.id && a.employee_id === profile.id))
      );

      return NextResponse.json({ items: visible });
    }

    if (type === 'directory') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email,designation,department_id,role')
        .eq('approval_status', 'approved')
        .eq('directory_visible', true)
        .order('full_name');

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    if (type === 'notifications') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    if (type === 'messages') {
      const { data, error } = await supabase
        .from('conversation_members')
        .select('conversation_id,last_read_at,conversations(id,title,is_group,updated_at)')
        .eq('employee_id', profile.id);

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    if (type === 'admin') {
      if (!adminRoles.includes(profile.role) || !requireAdminSession(request, profile.firebase_uid)) {
        return NextResponse.json({ error: 'Complete administrator verification first.' }, { status: 403 });
      }

      const [
        { data: pending, error: e1 },
        { data: employees, error: e2 }
      ] = await Promise.all([
        supabase.from('profiles').select('id,email,full_name,designation,created_at').eq('approval_status', 'pending').order('created_at'),
        supabase.from('profiles').select('id,email,full_name,designation,role,approval_status,created_at').order('created_at', { ascending: false }).limit(250)
      ]);

      if (e1) throw e1;
      if (e2) throw e2;

      return NextResponse.json({ pending: pending || [], employees: employees || [] });
    }

    if (type === 'analytics') {
      const [
        { count: allTasks },
        { count: doneTasks },
        { count: openTasks },
        { count: staff }
      ] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved')
      ]);

      return NextResponse.json({
        allTasks: allTasks || 0,
        doneTasks: doneTasks || 0,
        openTasks: openTasks || 0,
        staff: staff || 0
      });
    }

    if (type === 'conversation_messages') {
      const id = request.nextUrl.searchParams.get('id') || '';

      const { data: member } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('conversation_id', id)
        .eq('employee_id', profile.id)
        .maybeSingle();

      if (!member) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

      const { data, error } = await supabase
        .from('messages')
        .select('id,body,sender_id,created_at')
        .eq('conversation_id', id)
        .order('created_at')
        .limit(300);

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    if (type === 'search') {
      const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 80);

      if (q.length < 2) return NextResponse.json({ tasks: [], people: [] });

      const [
        { data: tasks },
        { data: people }
      ] = await Promise.all([
        supabase.from('tasks').select('id,title,status,assigned_to,assigned_by').ilike('title', `%${q}%`).limit(15),
        supabase.from('profiles').select('id,full_name,email').eq('approval_status', 'approved').eq('directory_visible', true).or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(15)
      ]);

      const allowedTasks = (tasks || []).filter(t =>
        t.assigned_to === profile.id || t.assigned_by === profile.id
      );

      return NextResponse.json({ tasks: allowedTasks, people: people || [] });
    }

    return NextResponse.json({ error: 'Unknown workspace resource.' }, { status: 404 });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await requireWorkspaceUser(request);
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'create_task') {
      const title = String(body.title || '').trim().slice(0, 180);
      const description = String(body.description || '').trim().slice(0, 5000);
      const assignedTo = String(body.assigned_to || profile.id);
      const priority = ['low', 'medium', 'high', 'urgent'].includes(body.priority) ? body.priority : 'medium';
      const visibility = ['private', 'department', 'company', 'selected'].includes(body.visibility) ? body.visibility : 'private';

      if (!title) return NextResponse.json({ error: 'A task title is required.' }, { status: 400 });

      const { data: assignee, error: assigneeError } = await supabase
        .from('profiles')
        .select('id,department_id,approval_status')
        .eq('id', assignedTo)
        .maybeSingle();

      if (assigneeError) throw assigneeError;
      if (!assignee || assignee.approval_status !== 'approved') {
        return NextResponse.json({ error: 'Choose an approved employee.' }, { status: 400 });
      }

      if (visibility === 'department' && !profile.department_id) {
        return NextResponse.json({ error: 'Set your department before creating a department task.' }, { status: 400 });
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title,
          description: description || null,
          assigned_by: profile.id,
          assigned_to: assignedTo,
          department_id: visibility === 'department' ? profile.department_id : null,
          priority,
          visibility,
          due_at: body.due_at || null
        })
        .select('*')
        .single();

      if (error) throw error;

      if (visibility === 'selected' && Array.isArray(body.audience_ids)) {
        const audienceValues: unknown[] = body.audience_ids;
        const validIds = audienceValues.filter(
          (value): value is string => typeof value === 'string' && value.length > 0 && value.length < 50
        );
        const ids = [...new Set<string>(validIds)].slice(0, 100);

        if (ids.length) {
          const { error: audienceError } = await supabase
            .from('task_audience')
            .insert(ids.map(employee_id => ({ task_id: task.id, employee_id })));

          if (audienceError) throw audienceError;
        }
      }

      await supabase.from('task_events').insert({
        task_id: task.id,
        actor_id: profile.id,
        event_type: 'created',
        details: { title }
      });

      if (assignedTo !== profile.id) {
        await supabase.from('notifications').insert({
          recipient_id: assignedTo,
          task_id: task.id,
          notification_type: 'task_assigned',
          title: 'New task assigned',
          message: title
        });
      }

      return NextResponse.json({ item: task });
    }

    if (action === 'update_task') {
      const id = String(body.id || '');

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (body.status === 'completed' && task.assigned_to === profile.id) {
        patch.status = 'completed';
        patch.completed_at = new Date().toISOString();
      } else if (body.status === 'pending' && task.assigned_by === profile.id) {
        patch.status = 'pending';
        patch.completed_at = null;
      } else if (body.status === 'in_progress' && task.assigned_to === profile.id) {
        patch.status = 'in_progress';
      } else {
        return NextResponse.json({ error: 'You cannot make that change to this task.' }, { status: 403 });
      }

      const { data: item, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      await supabase.from('task_events').insert({
        task_id: id,
        actor_id: profile.id,
        event_type: String(patch.status),
        details: {}
      });

      if (task.assigned_by !== profile.id) {
        await supabase.from('notifications').insert({
          recipient_id: task.assigned_by,
          task_id: id,
          notification_type: 'task_update',
          title: 'Task updated',
          message: patch.status === 'pending' ? 'A task was reopened.' : 'A task was marked complete.'
        });
      }

      return NextResponse.json({ item });
    }

    if (action === 'start_conversation') {
      const ids = [...new Set([
        profile.id,
        ...(Array.isArray(body.employee_ids)
          ? body.employee_ids.filter((value: unknown) => typeof value === 'string')
          : [])
      ])].slice(0, 30);

      if (ids.length < 2) {
        return NextResponse.json({ error: 'Select at least one other employee.' }, { status: 400 });
      }

      const { data: people, error: peopleError } = await supabase
        .from('profiles')
        .select('id')
        .in('id', ids)
        .eq('approval_status', 'approved');

      if (peopleError) throw peopleError;
      if ((people || []).length !== ids.length) {
        return NextResponse.json({ error: 'One or more employees are unavailable.' }, { status: 400 });
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          title: String(body.title || '').trim().slice(0, 120) || null,
          is_group: ids.length > 2,
          created_by: profile.id
        })
        .select('*')
        .single();

      if (error) throw error;

      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(ids.map(employee_id => ({ conversation_id: conversation.id, employee_id })));

      if (membersError) throw membersError;
      return NextResponse.json({ item: conversation });
    }

    if (action === 'send_message') {
      const conversationId = String(body.conversation_id || '');
      const message = String(body.message || '').trim().slice(0, 10000);

      if (!conversationId || !message) {
        return NextResponse.json({ error: 'Choose a conversation and enter a message.' }, { status: 400 });
      }

      const { data: member } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('conversation_id', conversationId)
        .eq('employee_id', profile.id)
        .maybeSingle();

      if (!member) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

      const { data: item, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: profile.id, body: message })
        .select('*')
        .single();

      if (error) throw error;

      await supabase.from('conversations').update({
        updated_at: new Date().toISOString()
      }).eq('id', conversationId);

      const { data: members } = await supabase
        .from('conversation_members')
        .select('employee_id')
        .eq('conversation_id', conversationId)
        .neq('employee_id', profile.id);

      if (members?.length) {
        await supabase.from('notifications').insert(
          members.map(m => ({
            recipient_id: m.employee_id,
            notification_type: 'message',
            title: 'New message',
            message: message.slice(0, 160)
          }))
        );
      }

      return NextResponse.json({ item });
    }

    if (action === 'mark_notification_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', String(body.id || ''))
        .eq('recipient_id', profile.id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'admin_review') {
      if (!adminRoles.includes(profile.role) || !requireAdminSession(request, profile.firebase_uid)) {
        return NextResponse.json({ error: 'Complete administrator verification first.' }, { status: 403 });
      }

      const target = String(body.employee_id || '');
      const decision = body.decision === 'approve'
        ? 'approved'
        : body.decision === 'reject'
          ? 'rejected'
          : null;

      if (!decision) return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 });

      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: decision, updated_at: new Date().toISOString() })
        .eq('id', target)
        .eq('approval_status', 'pending');

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return authError(error);
  }
}
