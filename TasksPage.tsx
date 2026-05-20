// TasksPage.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { canAssignTasks, isStaff, isAccounting } from '@/lib/permissions'
import { fmtDate } from '@/lib/format'
import { Panel, Table, Tr, Td, Badge, Button, ProgressBar, Modal, FormField, Input, Textarea, Select } from '@/components/shared/UI'
import type { Task, UserProfile } from '@/types'

export default function TasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [subordinates, setSubordinates] = useState<UserProfile[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [form, setForm] = useState({ assignedTo: '', title: '', desc: '', due: '', priority: 'Normal' })

  useEffect(() => { if (profile) { fetchTasks(); fetchSubs() } }, [profile])

  const fetchTasks = async () => {
    if (!profile) return
    const { data } = await supabase.from('tasks')
      .select('*, assignedByUser:user_profiles!assigned_by(*), assignedToUser:user_profiles!assigned_to(*)')
      .eq('tenant_id', profile.tenant_id)
      .or(`assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`)
      .order('due_date')
    setTasks(data ?? [])
  }

  const fetchSubs = async () => {
    if (!profile) return
    const { data } = await supabase.from('user_profiles')
      .select('*, post:posts(*,level:hierarchy_levels(*))')
      .eq('tenant_id', profile.tenant_id)
    // Filter to subordinates based on rank
    const rank = profile.post?.level?.rank ?? 4
    const subs = (data ?? []).filter((u: any) => {
      if (u.id === profile.id) return false
      const uRank = u.post?.level?.rank ?? 4
      if (rank === 1) return uRank > 1
      if (rank === 2) return uRank > 2 && u.post?.branch_entity_id === profile.post?.branch_entity_id
      if (rank === 3) return uRank === 4 && u.post?.dept_manager_post_id === profile.post_id
      return false
    })
    setSubordinates(subs)
  }

  const assignTask = async () => {
    if (!profile || !form.title || !form.due || !form.assignedTo) { alert('Fill all required fields'); return }
    await db.from('tasks').insert({
      tenant_id: profile.tenant_id, assigned_by: profile.id,
      assigned_to: form.assignedTo, title: form.title,
      description: form.desc, due_date: form.due,
      priority: form.priority as any, status: 'open', progress: 0,
      manager_confirmed: false, entity_id: profile.entity_id!
    })
    setShowAssign(false); setForm({ assignedTo: '', title: '', desc: '', due: '', priority: 'Normal' }); fetchTasks()
  }

  const updateProgress = async (task: any) => {
    const pct = parseInt(prompt(`Progress for "${task.title}" (${task.progress}%)\n0–100:`) ?? '')
    if (isNaN(pct) || pct < 0 || pct > 100) return
    await db.from('tasks').update({ progress: pct, status: pct === 100 ? 'done' : pct > 0 ? 'inprogress' : 'open' }).eq('id', task.id)
    fetchTasks()
  }

  const confirmTask = async (id: string) => {
    await db.from('tasks').update({ manager_confirmed: true, status: 'confirmed' }).eq('id', id)
    fetchTasks()
  }

  const mine = tasks.filter((t: any) => t.assigned_to === profile?.id)
  const iAssigned = tasks.filter((t: any) => t.assigned_by === profile?.id && t.assigned_to !== profile?.id)

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2640]">
        <div>
          <h1 className="font-bebas text-3xl tracking-widest text-white">TASKS</h1>
          <p className="text-xs text-slate-400 mt-1">Assigned to you + tasks you've assigned</p>
        </div>
        {canAssignTasks(profile) && <Button variant="gold" onClick={() => setShowAssign(true)}>+ Assign Task</Button>}
      </div>

      {mine.length > 0 && (
        <Panel title="ASSIGNED TO ME">
          <Table headers={['TASK','FROM','DUE','PRIORITY','STATUS','PROGRESS','']}>
            {mine.map((t: any) => {
              const overdue = new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'confirmed'
              return (
                <Tr key={t.id}>
                  <Td><span className="text-white">{t.title}{overdue && <span className="ml-2 text-[8px] text-red-400 border border-red-400/30 rounded px-1">OVERDUE</span>}</span></Td>
                  <Td className="text-[10px]">{t.assignedByUser?.full_name}</Td>
                  <Td className={overdue ? 'text-red-400' : 'text-slate-500'}>{fmtDate(t.due_date)}</Td>
                  <Td><Badge status={t.priority.toLowerCase()} /></Td>
                  <Td><Badge status={t.manager_confirmed ? 'confirmed' : t.status} /></Td>
                  <Td><ProgressBar value={t.progress} /></Td>
                  <Td>{t.status !== 'done' && t.status !== 'confirmed' && <Button variant="ghost" size="sm" onClick={() => updateProgress(t)}>Update</Button>}</Td>
                </Tr>
              )
            })}
          </Table>
        </Panel>
      )}

      {iAssigned.length > 0 && (
        <Panel title="TASKS I ASSIGNED">
          <Table headers={['TASK','ASSIGNED TO','DUE','STATUS','PROGRESS','']}>
            {iAssigned.map((t: any) => (
              <Tr key={t.id}>
                <Td><span className="text-white">{t.title}</span></Td>
                <Td className="text-[10px]">{t.assignedToUser?.full_name}</Td>
                <Td className="text-slate-500">{fmtDate(t.due_date)}</Td>
                <Td><Badge status={t.manager_confirmed ? 'confirmed' : t.status} /></Td>
                <Td><ProgressBar value={t.progress} /></Td>
                <Td>{t.status === 'done' && !t.manager_confirmed && <Button variant="ok" size="sm" onClick={() => confirmTask(t.id)}>Confirm</Button>}</Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {mine.length === 0 && iAssigned.length === 0 && (
        <div className="text-center py-16 text-slate-600"><div className="text-3xl mb-3">✓</div><div className="text-sm">No tasks yet.</div></div>
      )}

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="ASSIGN TASK"
        footer={<div className="flex gap-2 justify-end w-full"><Button variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button><Button variant="gold" onClick={assignTask}>Assign →</Button></div>}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><FormField label="Assign To">
            <Select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">-- Select person --</option>
              {subordinates.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </Select>
          </FormField></div>
          <div className="col-span-2"><FormField label="Task Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" /></FormField></div>
          <div className="col-span-2"><FormField label="Description"><Textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Details and expectations…" /></FormField></div>
          <FormField label="Due Date"><Input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></FormField>
          <FormField label="Priority"><Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>Normal</option><option>High</option><option>Urgent</option></Select></FormField>
        </div>
      </Modal>
    </div>
  )
}
