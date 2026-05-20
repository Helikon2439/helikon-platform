// TargetsPage
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { canSetTargets } from '@/lib/permissions'
import { Panel, Table, Tr, Td, Badge, Button, ProgressBar, Modal, FormField, Input, Textarea, Select } from '@/components/shared/UI'
import type { UserProfile } from '@/types'

export function TargetsPage() {
  const { profile } = useAuth()
  const [targets, setTargets] = useState<any[]>([])
  const [subs, setSubs] = useState<UserProfile[]>([])
  const [showSet, setShowSet] = useState(false)
  const [form, setForm] = useState({ to: '', title: '', desc: '', type: 'Sales', deadline: '' })

  useEffect(() => { if (profile) { fetchTargets(); fetchSubs() } }, [profile])

  const fetchTargets = async () => {
    if (!profile) return
    const { data } = await supabase.from('targets')
      .select('*, setByUser:user_profiles!set_by(*), assignedToUser:user_profiles!assigned_to(*)')
      .eq('tenant_id', profile.tenant_id)
      .or(`assigned_to.eq.${profile.id},set_by.eq.${profile.id}`)
      .order('deadline')
    setTargets(data ?? [])
  }

  const fetchSubs = async () => {
    if (!profile) return
    const { data } = await supabase.from('user_profiles').select('*, post:posts(*,level:hierarchy_levels(*))').eq('tenant_id', profile.tenant_id)
    const rank = profile.post?.level?.rank ?? 4
    setSubs((data ?? []).filter((u: any) => {
      if (u.id === profile.id) return false
      const uRank = u.post?.level?.rank ?? 4
      if (rank === 1) return uRank > 1
      if (rank === 2) return uRank > 2 && u.post?.branch_entity_id === profile.post?.branch_entity_id
      if (rank === 3) return uRank === 4 && u.post?.dept_manager_post_id === profile.post_id
      return false
    }))
  }

  const setTarget = async () => {
    if (!profile || !form.title || !form.deadline || !form.to) { alert('Fill all required fields'); return }
    await db.from('targets').insert({ tenant_id: profile.tenant_id, set_by: profile.id, assigned_to: form.to, title: form.title, description: form.desc, target_type: form.type, deadline: form.deadline, progress: 0, manager_confirmed: false, entity_id: profile.entity_id! })
    setShowSet(false); fetchTargets()
  }

  const mine = targets.filter((t: any) => t.assigned_to === profile?.id)
  const iSet = targets.filter((t: any) => t.set_by === profile?.id && t.assigned_to !== profile?.id)

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2640]">
        <div><h1 className="font-bebas text-3xl tracking-widest text-white">TARGETS</h1><p className="text-xs text-slate-400 mt-1">Performance targets</p></div>
        {canSetTargets(profile) && <Button variant="gold" onClick={() => setShowSet(true)}>+ Set Target</Button>}
      </div>
      {mine.length > 0 && (
        <Panel title="MY TARGETS">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mine.map((t: any) => (
              <div key={t.id} className="bg-[#111420] border border-[#1e2640] rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[12px] text-white font-semibold flex-1">{t.title}</div>
                  <span className="bg-[#161b28] border border-[#1e2640] rounded text-[8px] text-slate-400 px-1.5 py-0.5 ml-2">{t.target_type}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-2">{t.description}</div>
                <div className="text-[9px] text-slate-500 mb-2">Deadline {t.deadline} · Set by {t.setByUser?.full_name}</div>
                <ProgressBar value={t.progress} />
                {t.progress < 100
                  ? <Button variant="ghost" size="sm" className="w-full mt-2" onClick={async () => { const pct = parseInt(prompt(`Progress (${t.progress}%):\n0–100:`) ?? ''); if (!isNaN(pct) && pct >= 0 && pct <= 100) { await db.from('targets').update({ progress: pct }).eq('id', t.id); fetchTargets() } }}>Update Progress</Button>
                  : t.manager_confirmed ? <div className="text-[10px] text-emerald-400 text-center mt-2">✓ Confirmed</div>
                  : <div className="text-[10px] text-amber-400 text-center mt-2">⏳ Awaiting confirmation</div>}
              </div>
            ))}
          </div>
        </Panel>
      )}
      {iSet.length > 0 && (
        <Panel title="TARGETS I SET">
          <Table headers={['TARGET','ASSIGNED TO','TYPE','DEADLINE','PROGRESS','']}>
            {iSet.map((t: any) => (
              <Tr key={t.id}>
                <Td><span className="text-white">{t.title}</span></Td>
                <Td className="text-[10px]">{t.assignedToUser?.full_name}</Td>
                <Td><span className="bg-[#161b28] border border-[#1e2640] rounded text-[8px] text-slate-400 px-1.5 py-0.5">{t.target_type}</span></Td>
                <Td className="text-slate-500">{t.deadline}</Td>
                <Td><ProgressBar value={t.progress} /></Td>
                <Td>{t.progress >= 100 && !t.manager_confirmed && <Button variant="ok" size="sm" onClick={async () => { await db.from('targets').update({ manager_confirmed: true }).eq('id', t.id); fetchTargets() }}>Confirm</Button>}</Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}
      <Modal open={showSet} onClose={() => setShowSet(false)} title="SET TARGET"
        footer={<div className="flex gap-2 justify-end w-full"><Button variant="ghost" onClick={() => setShowSet(false)}>Cancel</Button><Button variant="gold" onClick={setTarget}>Set Target →</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><FormField label="Assign To"><Select value={form.to} onChange={e => setForm({ ...form, to: e.target.value })}><option value="">-- Select --</option>{subs.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select></FormField></div>
          <div className="col-span-2"><FormField label="Target Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Close 20 CCTV deals in Q2" /></FormField></div>
          <div className="col-span-2"><FormField label="Description / Metric"><Textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="How will this be measured?" /></FormField></div>
          <FormField label="Deadline"><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></FormField>
          <FormField label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Sales</option><option>Revenue</option><option>Operations</option><option>Customer</option><option>Team</option><option>Personal</option></Select></FormField>
        </div>
      </Modal>
    </div>
  )
}

export default TargetsPage
