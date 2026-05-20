import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { isExec, isAccounting, isBranchManager, isHR, canSeeHierarchy } from '@/lib/permissions'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { Panel, Table, Tr, Td, Badge, Button, StatCard, ProgressBar, Modal, FormField, Input, Textarea, Select, AccessDenied, EntityTag } from '@/components/shared/UI'
import RequestDetailModal from '@/components/requests/RequestDetailModal'

// ═══════════════════════════════════════════
// OVERSIGHT PAGE
// ═══════════════════════════════════════════
export function OversightPage() {
  const { profile } = useAuth()
  const [subs, setSubs] = useState<any[]>([])
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)

  useEffect(() => { if (profile) fetchSubs() }, [profile])

  const fetchSubs = async () => {
    if (!profile) return
    const { data: allUsers } = await supabase.from('user_profiles')
      .select('*, post:posts(*,level:hierarchy_levels(*)), entity:entities(*)')
      .eq('tenant_id', profile.tenant_id)

    const rank = profile.post?.level?.rank ?? 4
    const myBranch = profile.post?.branch_entity_id
    const myPostId = profile.post_id

    const filtered = (allUsers ?? []).filter((u: any) => {
      if (u.id === profile.id) return false
      const uRank = u.post?.level?.rank ?? 4
      if (rank === 1) return true
      if (rank === 2) return uRank > 2 && u.post?.branch_entity_id === myBranch
      if (rank === 3) return uRank === 4 && u.post?.dept_manager_post_id === myPostId
      return false
    })

    // Enrich with tasks, targets, requests
    const enriched = await Promise.all(filtered.map(async (u: any) => {
      const [tasksRes, reqsRes, targetsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('assigned_to', u.id).eq('tenant_id', profile.tenant_id),
        supabase.from('funding_requests').select('*').eq('requester_id', u.id).eq('tenant_id', profile.tenant_id),
        supabase.from('targets').select('*').eq('assigned_to', u.id).eq('tenant_id', profile.tenant_id),
      ])
      return { ...u, tasks: tasksRes.data ?? [], requests: reqsRes.data ?? [], targets: targetsRes.data ?? [] }
    }))

    setSubs(enriched)
  }

  if (!profile) return null

  return (
    <div className="animate-fade-up">
      <div className="mb-5 pb-4 border-b border-[#1e2640]">
        <h1 className="font-bebas text-3xl tracking-widest text-white">OVERSIGHT</h1>
        <p className="text-xs text-slate-400 mt-1">Full view of everyone under your authority</p>
      </div>
      {subs.length === 0 ? (
        <div className="text-center py-16 text-slate-600"><div className="text-3xl mb-3">◫</div><div className="text-sm">No subordinates within your scope.</div></div>
      ) : (
        subs.map((u: any) => {
          const dotColors: Record<number, string> = { 1: '#60a5fa', 2: '#f97316', 3: '#a78bfa', 4: '#94a3b8', 5: '#34d399', 6: '#f472b6' }
          const dot = dotColors[u.post?.level?.rank ?? 4] ?? '#94a3b8'
          const done = u.tasks.filter((t: any) => t.manager_confirmed).length
          const active = u.tasks.filter((t: any) => !t.manager_confirmed && ['open', 'inprogress'].includes(t.status)).length
          const funded = u.requests.filter((r: any) => r.status === 'funded').length
          const rejected = u.requests.filter((r: any) => r.status === 'rejected').length

          return (
            <div key={u.id} className="bg-[#0c0e14] border border-[#1e2640] rounded-lg p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot, boxShadow: `0 0 4px ${dot}` }} />
                <div>
                  <div className="text-[13px] text-white font-semibold">{u.full_name}</div>
                  <div className="text-[10px] text-slate-400">{u.post?.title} · {u.entity?.name}</div>
                </div>
                <div className="ml-auto">{u.entity && <EntityTag name={u.entity.short_name ?? u.entity.name} color={u.entity.brand_color} />}</div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[['Tasks Done', done, '#34d399'], ['Active', active, '#fbbf24'], ['Funded', funded, '#60a5fa'], ['Rejected', rejected, '#f87171']].map(([lbl, val, col]) => (
                  <div key={lbl as string} className="bg-[#111420] border border-[#1e2640] rounded p-2 text-center">
                    <div className="font-bebas text-[18px]" style={{ color: col as string }}>{val as number}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wide">{lbl as string}</div>
                  </div>
                ))}
              </div>

              {u.requests.length > 0 && (
                <div className="mb-2">
                  <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-1.5">Funding Requests</div>
                  <div className="flex gap-2 flex-wrap">
                    {u.requests.map((r: any) => (
                      <button key={r.id} onClick={() => setSelectedReqId(r.id)}
                        className="bg-[#111420] border border-[#1e2640] rounded px-2 py-1 text-[9px] hover:border-[#d4a84b] transition-colors flex items-center gap-1.5">
                        <span className="text-[#d4a84b] font-bebas text-[11px]">{r.ref}</span>
                        <Badge status={r.status} />
                        <span className="text-white">{fmtCurrency(r.amount)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {u.targets.length > 0 && (
                <div>
                  <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-1.5">Targets</div>
                  {u.targets.map((t: any) => (
                    <div key={t.id} className="mb-2">
                      <div className="text-[10px] text-white mb-1">{t.title}</div>
                      <ProgressBar value={t.progress} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {selectedReqId && <RequestDetailModal requestId={selectedReqId} onClose={() => setSelectedReqId(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════
// HR PAGE
// ═══════════════════════════════════════════
export function HRPage() {
  const { profile } = useAuth()
  const [leave, setLeave] = useState<any[]>([])
  const [complaints, setComplaints] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [showLeave, setShowLeave] = useState(false)
  const [showComplaint, setShowComplaint] = useState(false)
  const [showVendor, setShowVendor] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ start: '', end: '', type: 'Annual Leave', acting: '', handover: '', reason: '' })
  const [complaintForm, setComplaintForm] = useState({ cat: 'Workplace Harassment', entity: '', desc: '' })
  const [vendorForm, setVendorForm] = useState({ name: '', cat: 'Technology', contact: '', notes: '' })
  const [allUsers, setAllUsers] = useState<any[]>([])

  useEffect(() => { if (profile) { fetchLeave(); fetchComplaints(); fetchVendors(); fetchUsers() } }, [profile])

  const fetchLeave = async () => {
    if (!profile) return
    const { data } = await supabase.from('leave_requests').select('*, requester:user_profiles!requester_id(*), approvals:leave_approvals(*,approver:user_profiles(*))').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false })
    setLeave(data ?? [])
  }
  const fetchComplaints = async () => {
    if (!profile) return
    const { data } = await supabase.from('complaints').select('*, entity:entities(*)').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false })
    setComplaints(data ?? [])
  }
  const fetchVendors = async () => {
    if (!profile) return
    const { data } = await supabase.from('vendors').select('*').eq('tenant_id', profile.tenant_id)
    setVendors(data ?? [])
  }
  const fetchUsers = async () => {
    if (!profile) return
    const { data } = await supabase.from('user_profiles').select('*').eq('tenant_id', profile.tenant_id)
    setAllUsers(data ?? [])
  }

  const submitLeave = async () => {
    if (!profile || !leaveForm.start || !leaveForm.end) { alert('Set dates'); return }
    await db.from('leave_requests').insert({ tenant_id: profile.tenant_id, requester_id: profile.id, start_date: leaveForm.start, end_date: leaveForm.end, leave_type: leaveForm.type, acting_user_id: leaveForm.acting || null, handover_notes: leaveForm.handover, reason: leaveForm.reason, status: 'pending' })
    setShowLeave(false); fetchLeave()
  }

  const approveLeave = async (lv: any) => {
    if (!profile) return
    const already = (lv.approvals ?? []).find((a: any) => a.approver_id === profile.id)
    if (already) { alert('You already approved this'); return }
    await db.from('leave_approvals').insert({ tenant_id: profile.tenant_id, leave_request_id: lv.id, approver_id: profile.id })
    const newCount = (lv.approvals?.length ?? 0) + 1
    if (newCount >= 2) await db.from('leave_requests').update({ status: 'approved' }).eq('id', lv.id)
    fetchLeave()
  }

  const submitComplaint = async () => {
    if (!profile || complaintForm.desc.trim().length < 30) { alert('Please provide more detail (min 30 characters)'); return }
    const { data } = await db.from('complaints').insert({ tenant_id: profile.tenant_id, category: complaintForm.cat, entity_id: complaintForm.entity || profile.entity_id!, description: complaintForm.desc, status: 'under review' }).select().single()
    alert(`✓ Complaint submitted anonymously.\n\nYour case reference: ${(data as any)?.id?.slice(0, 8).toUpperCase()}\n\nSave this to follow up. Your identity has not been recorded.`)
    setShowComplaint(false); fetchComplaints()
  }

  const addVendor = async () => {
    if (!profile || !vendorForm.name) { alert('Vendor name required'); return }
    await db.from('vendors').insert({ tenant_id: profile.tenant_id, name: vendorForm.name, category: vendorForm.cat, contact: vendorForm.contact, notes: vendorForm.notes, is_verified: false, created_by: profile.id })
    setShowVendor(false); fetchVendors()
  }

  const myLeave = leave.filter((l: any) => l.requester_id === profile?.id)
  const actingFor = leave.filter((l: any) => l.acting_user_id === profile?.id && l.status === 'approved')
  const pendingApproval = leave.filter((l: any) => {
    if (l.status !== 'pending') return false
    const rank = profile?.post?.level?.rank ?? 4
    return rank <= 3 && !(l.approvals ?? []).find((a: any) => a.approver_id === profile?.id)
  })

  const canSeeComplaints = isExec(profile) || isHR(profile)

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2640]">
        <div><h1 className="font-bebas text-3xl tracking-widest text-white">HUMAN RESOURCES</h1><p className="text-xs text-slate-400 mt-1">Leave · Handovers · Complaints · Vendors</p></div>
        <div className="flex gap-2">
          <Button variant="pink" onClick={() => setShowLeave(true)}>+ Leave Request</Button>
          <Button variant="ghost" onClick={() => setShowComplaint(true)}>Anonymous Complaint</Button>
        </div>
      </div>

      {actingFor.length > 0 && (
        <Panel title="⚡ YOU ARE CURRENTLY ACTING FOR">
          <Table headers={['PERSON', 'TYPE', 'FROM', 'TO', 'HANDOVER NOTES']}>
            {actingFor.map((l: any) => (
              <Tr key={l.id}>
                <Td><span className="text-white font-semibold">{l.requester?.full_name}</span></Td>
                <Td>{l.leave_type}</Td>
                <Td>{l.start_date}</Td>
                <Td>{l.end_date}</Td>
                <Td className="text-[10px]">{l.handover_notes || '—'}</Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {pendingApproval.length > 0 && (
        <Panel title="LEAVE REQUESTS AWAITING YOUR APPROVAL">
          <Table headers={['ID', 'PERSON', 'TYPE', 'FROM', 'TO', 'ACTING', 'APPROVALS', '']}>
            {pendingApproval.map((l: any) => (
              <Tr key={l.id}>
                <Td><span className="text-pink-400 font-bold">{l.id.slice(0, 8).toUpperCase()}</span></Td>
                <Td><span className="text-white">{l.requester?.full_name}</span></Td>
                <Td>{l.leave_type}</Td>
                <Td>{l.start_date}</Td>
                <Td>{l.end_date}</Td>
                <Td className="text-[10px]">{allUsers.find((u: any) => u.id === l.acting_user_id)?.full_name || '—'}</Td>
                <Td><span className="font-bebas text-[14px]">{l.approvals?.length ?? 0}/2</span></Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Button variant="ok" size="sm" onClick={() => approveLeave(l)}>Approve</Button>
                    <Button variant="danger" size="sm" onClick={async () => { await db.from('leave_requests').update({ status: 'rejected' }).eq('id', l.id); fetchLeave() }}>Reject</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      <Panel title="MY LEAVE REQUESTS" action={<Button variant="pink" size="sm" onClick={() => setShowLeave(true)}>+ New</Button>}>
        {myLeave.length ? (
          <Table headers={['TYPE', 'FROM', 'TO', 'ACTING', 'STATUS', 'APPROVALS']}>
            {myLeave.map((l: any) => (
              <Tr key={l.id}>
                <Td>{l.leave_type}</Td><Td>{l.start_date}</Td><Td>{l.end_date}</Td>
                <Td className="text-[10px]">{allUsers.find((u: any) => u.id === l.acting_user_id)?.full_name || '—'}</Td>
                <Td><Badge status={l.status} /></Td>
                <Td><span className="font-bebas text-[14px]">{l.approvals?.length ?? 0}/2</span></Td>
              </Tr>
            ))}
          </Table>
        ) : <div className="text-center py-6 text-slate-600 text-xs">No leave requests submitted.</div>}
      </Panel>

      {(isExec(profile) || isHR(profile) || isBranchManager(profile)) && (
        <Panel title="ALL LEAVE">
          <Table headers={['PERSON', 'TYPE', 'FROM', 'TO', 'STATUS', 'ACTING']}>
            {leave.map((l: any) => (
              <Tr key={l.id}>
                <Td><span className="text-white">{l.requester?.full_name}</span></Td>
                <Td>{l.leave_type}</Td><Td>{l.start_date}</Td><Td>{l.end_date}</Td>
                <Td><Badge status={l.status} /></Td>
                <Td className="text-[10px]">{allUsers.find((u: any) => u.id === l.acting_user_id)?.full_name || '—'}</Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {canSeeComplaints && (
        <Panel title="ANONYMOUS COMPLAINTS" subtitle="Identities never stored">
          <Table headers={['REF', 'CATEGORY', 'SUBSIDIARY', 'DATE', 'STATUS', 'SUMMARY']}>
            {complaints.map((c: any) => (
              <Tr key={c.id}>
                <Td><span className="text-pink-400 font-bold">{c.id.slice(0, 8).toUpperCase()}</span></Td>
                <Td>{c.category}</Td>
                <Td>{c.entity && <EntityTag name={c.entity.short_name ?? c.entity.name} color={c.entity.brand_color} />}</Td>
                <Td className="text-slate-500 text-[10px]">{fmtDate(c.created_at)}</Td>
                <Td><Badge status={c.status.replace(' ', '_')} /></Td>
                <Td><span className="max-w-[200px] block truncate text-[10px]">{c.description}</span></Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {(isExec(profile) || isBranchManager(profile) || isAccounting(profile)) && (
        <Panel title="VENDOR REGISTER" action={<Button variant="ghost" size="sm" onClick={() => setShowVendor(true)}>+ Add</Button>}>
          <Table headers={['VENDOR', 'CATEGORY', 'CONTACT', 'NOTES', 'STATUS']}>
            {vendors.map((v: any) => (
              <Tr key={v.id}>
                <Td><span className="text-white font-semibold">{v.name}</span></Td>
                <Td><span className="bg-[#161b28] border border-[#1e2640] rounded text-[9px] text-slate-400 px-1.5 py-0.5">{v.category}</span></Td>
                <Td className="text-[10px]">{v.contact}</Td>
                <Td className="text-[10px]">{v.notes}</Td>
                <Td><Badge status={v.is_verified ? 'approved' : 'pending'} /></Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="LEAVE REQUEST"
        footer={<div className="flex gap-2 justify-end w-full"><Button variant="ghost" onClick={() => setShowLeave(false)}>Cancel</Button><Button variant="pink" onClick={submitLeave}>Submit →</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date"><Input type="date" value={leaveForm.start} onChange={e => setLeaveForm({ ...leaveForm, start: e.target.value })} /></FormField>
          <FormField label="End Date"><Input type="date" value={leaveForm.end} onChange={e => setLeaveForm({ ...leaveForm, end: e.target.value })} /></FormField>
          <FormField label="Leave Type"><Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}><option>Annual Leave</option><option>Sick Leave</option><option>Compassionate Leave</option><option>Study Leave</option><option>Maternity/Paternity</option></Select></FormField>
          <FormField label="Acting Person"><Select value={leaveForm.acting} onChange={e => setLeaveForm({ ...leaveForm, acting: e.target.value })}><option value="">-- Select --</option>{allUsers.filter(u => u.id !== profile?.id).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</Select></FormField>
          <div className="col-span-2"><FormField label="Reason"><Textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional context…" /></FormField></div>
          <div className="col-span-2"><FormField label="Handover Notes"><Textarea value={leaveForm.handover} onChange={e => setLeaveForm({ ...leaveForm, handover: e.target.value })} placeholder="What the acting person needs to know…" /></FormField></div>
          <div className="col-span-2 bg-[#111420] border border-[#1e2640] rounded p-2.5 text-[10px] text-slate-400">⚡ Leave requires 2 approvals. Acting authority granted automatically on full approval.</div>
        </div>
      </Modal>

      <Modal open={showComplaint} onClose={() => setShowComplaint(false)} title="ANONYMOUS COMPLAINT"
        footer={<div className="flex gap-2 justify-end w-full"><Button variant="ghost" onClick={() => setShowComplaint(false)}>Cancel</Button><Button variant="pink" onClick={submitComplaint}>Submit Anonymously →</Button></div>}>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2.5 text-[10px] text-emerald-400 mb-3">✓ Your identity is never stored with this complaint.</div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category"><Select value={complaintForm.cat} onChange={e => setComplaintForm({ ...complaintForm, cat: e.target.value })}><option>Workplace Harassment</option><option>Discrimination</option><option>Financial Misconduct</option><option>Safety Concern</option><option>Policy Violation</option><option>Other</option></Select></FormField>
          <FormField label="Relates to Subsidiary"><Select value={complaintForm.entity} onChange={e => setComplaintForm({ ...complaintForm, entity: e.target.value })}><option value="">General</option></Select></FormField>
          <div className="col-span-2"><FormField label="Description (min 30 characters)"><Textarea value={complaintForm.desc} onChange={e => setComplaintForm({ ...complaintForm, desc: e.target.value })} placeholder="Describe the issue in detail. Do not include your own name." style={{ minHeight: '100px' }} /></FormField></div>
        </div>
      </Modal>

      <Modal open={showVendor} onClose={() => setShowVendor(false)} title="ADD VENDOR"
        footer={<div className="flex gap-2 justify-end w-full"><Button variant="ghost" onClick={() => setShowVendor(false)}>Cancel</Button><Button variant="gold" onClick={addVendor}>Add Vendor →</Button></div>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><FormField label="Vendor Name"><Input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="Company name" /></FormField></div>
          <FormField label="Category"><Select value={vendorForm.cat} onChange={e => setVendorForm({ ...vendorForm, cat: e.target.value })}><option>Technology</option><option>Security</option><option>Printing</option><option>Travel</option><option>Stationery</option><option>Other</option></Select></FormField>
          <FormField label="Contact"><Input value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })} placeholder="+263…" /></FormField>
          <div className="col-span-2"><FormField label="Notes"><Input value={vendorForm.notes} onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })} placeholder="Payment terms, conditions…" /></FormField></div>
        </div>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════════
// ACCOUNTING PAGE
// ═══════════════════════════════════════════
export function AccountingPage() {
  const { profile } = useAuth()
  const [budgets, setBudgets] = useState<any[]>([])
  const [approved, setApproved] = useState<any[]>([])
  const [reserved, setReserved] = useState<any[]>([])
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)

  useEffect(() => { if (profile) fetchAll() }, [profile])

  const fetchAll = async () => {
    if (!profile) return
    const [bRes, aRes, rRes] = await Promise.all([
      supabase.from('budget_pools').select('*, entity:entities(*)').eq('tenant_id', profile.tenant_id),
      supabase.from('funding_requests').select('*, entity:entities(*), approver:user_profiles!approved_by(*)').eq('tenant_id', profile.tenant_id).eq('status', 'approved').order('created_at'),
      supabase.from('funding_requests').select('*, entity:entities(*)').eq('tenant_id', profile.tenant_id).eq('status', 'reserved').order('created_at'),
    ])
    // BM only sees their branch
    const myBranch = profile.post?.branch_entity_id
    setBudgets(isBranchManager(profile) && !isExec(profile) ? (bRes.data ?? []).filter((b: any) => b.entity_id === myBranch) : (bRes.data ?? []))
    setApproved(aRes.data ?? [])
    setReserved(rRes.data ?? [])
  }

  if (!isExec(profile) && !isAccounting(profile) && !isBranchManager(profile)) {
    return <div className="animate-fade-up"><AccessDenied message="Access restricted — Accounting, Branch Managers, and Executives only" /></div>
  }

  const totalAvail = budgets.reduce((s: number, b: any) => s + (b.total_amount - b.used_amount), 0)
  const totalUsed = budgets.reduce((s: number, b: any) => s + b.used_amount, 0)

  const fund = async (id: string, entityId: string, amount: number) => {
    await db.from('funding_requests').update({ status: 'funded', funded_by: profile?.id, funded_at: new Date().toISOString() }).eq('id', id)
    await db.from('budget_pools').update({ used_amount: supabase.rpc as any }).eq('entity_id', entityId)
    fetchAll()
  }

  const exportCSV = () => {
    const rows = [['Ref', 'Description', 'Amount', 'Status', 'Entity', 'Date'],
      ...[...approved, ...reserved].map((r: any) => [r.ref, `"${r.description}"`, r.amount, r.status, r.entity?.name ?? '', r.created_at])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `helikon_requests_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2640]">
        <div><h1 className="font-bebas text-3xl tracking-widest text-white">ACCOUNTING</h1><p className="text-xs text-slate-400 mt-1">Budget pools · Disbursement queue · Reserved</p></div>
        <Button variant="ghost" onClick={exportCSV}>↓ Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Available" value={fmtCurrency(totalAvail)} color="green" />
        <StatCard label="Utilised" value={fmtCurrency(totalUsed)} color="amber" />
        <StatCard label="Awaiting Fund" value={approved.length} color="blue" />
        <StatCard label="Reserved Queue" value={reserved.length} color="red" />
      </div>

      <Panel title="BUDGET POOLS — BRANCH & DEPT">
        <Table headers={['BRANCH', 'DEPT', 'TOTAL', 'USED', 'AVAILABLE', 'UTILISATION']}>
          {budgets.map((b: any) => {
            const avail = b.total_amount - b.used_amount
            const pct = b.total_amount > 0 ? Math.round(b.used_amount / b.total_amount * 100) : 0
            const barColor = pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : '#34d399'
            return (
              <Tr key={b.id}>
                <Td>{b.entity && <EntityTag name={b.entity.short_name ?? b.entity.name} color={b.entity.brand_color} />}</Td>
                <Td><span className="bg-[#161b28] border border-[#1e2640] rounded text-[9px] text-slate-400 px-1.5 py-0.5">{b.department}</span></Td>
                <Td>{fmtCurrency(b.total_amount)}</Td>
                <Td className="text-slate-400">{fmtCurrency(b.used_amount)}</Td>
                <Td><span className="text-emerald-400 font-semibold">{fmtCurrency(avail)}</span></Td>
                <Td>
                  <div className="text-[9px] text-slate-500 mb-1">{pct}%</div>
                  <div className="h-1 bg-[#161b28] rounded-full overflow-hidden w-24">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Panel>

      {(isAccounting(profile) || isExec(profile)) && <>
        <Panel title="APPROVED — AWAITING DISBURSEMENT" subtitle="Accounting action required">
          <Table headers={['REF', 'ENTITY', 'DESCRIPTION', 'AMOUNT', 'APPROVED BY', '']}>
            {approved.length ? approved.map((r: any) => (
              <Tr key={r.id}>
                <Td><span className="font-bebas text-[14px] text-[#d4a84b]">{r.ref}</span></Td>
                <Td>{r.entity && <EntityTag name={r.entity.short_name ?? r.entity.name} color={r.entity.brand_color} />}</Td>
                <Td><span className="max-w-[160px] block truncate">{r.description}</span></Td>
                <Td><span className="text-white font-semibold">{fmtCurrency(r.amount)}</span></Td>
                <Td className="text-[10px]">{(r.approver as any)?.full_name ?? '—'}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    <Button variant="ok" size="sm" onClick={async () => {
                      await db.from('funding_requests').update({ status: 'funded', funded_by: profile?.id, funded_at: new Date().toISOString() }).eq('id', r.id)
                      // Budget used_amount updated via separate rpc on fund
                      fetchAll()
                    }}>Fund</Button>
                    <Button variant="warn" size="sm" onClick={async () => { await db.from('funding_requests').update({ status: 'reserved' }).eq('id', r.id); fetchAll() }}>Reserve</Button>
                  </div>
                </Td>
              </Tr>
            )) : <Tr><Td className="text-center py-6 text-slate-600 col-span-6">None pending</Td></Tr>}
          </Table>
        </Panel>

        <Panel title="RESERVED QUEUE" subtitle="Insufficient funds at approval time">
          <Table headers={['REF', 'ENTITY', 'DESCRIPTION', 'AMOUNT', 'SINCE', '']}>
            {reserved.length ? reserved.map((r: any) => (
              <Tr key={r.id}>
                <Td><span className="font-bebas text-[14px] text-[#d4a84b]">{r.ref}</span></Td>
                <Td>{r.entity && <EntityTag name={r.entity.short_name ?? r.entity.name} color={r.entity.brand_color} />}</Td>
                <Td><span className="max-w-[160px] block truncate">{r.description}</span></Td>
                <Td><span className="text-amber-400 font-semibold">{fmtCurrency(r.amount)}</span></Td>
                <Td className="text-slate-500 text-[10px]">{fmtDate(r.created_at)}</Td>
                <Td><Button variant="warn" size="sm" onClick={async () => { await db.from('funding_requests').update({ status: 'funded', funded_by: profile?.id, funded_at: new Date().toISOString() }).eq('id', r.id); fetchAll() }}>Release & Fund</Button></Td>
              </Tr>
            )) : <Tr><Td className="text-center py-6 text-slate-600 col-span-6">Queue empty</Td></Tr>}
          </Table>
        </Panel>
      </>}

      {selectedReqId && <RequestDetailModal requestId={selectedReqId} onClose={() => setSelectedReqId(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════════
export function AnalyticsPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<any[]>([])

  useEffect(() => { if (profile && isExec(profile)) fetchData() }, [profile])

  const fetchData = async () => {
    if (!profile) return
    const { data: entities } = await supabase.from('entities').select('*').eq('tenant_id', profile.tenant_id).eq('entity_type', 'branch')
    const { data: reqs } = await supabase.from('funding_requests').select('*, entity:entities(*)').eq('tenant_id', profile.tenant_id)
    const { data: tasks } = await supabase.from('tasks').select('*').eq('tenant_id', profile.tenant_id)
    const { data: targets } = await supabase.from('targets').select('*').eq('tenant_id', profile.tenant_id)
    const { data: budgets } = await supabase.from('budget_pools').select('*').eq('tenant_id', profile.tenant_id)

    const enriched = (entities ?? []).map((e: any) => {
      const eReqs = (reqs ?? []).filter((r: any) => r.entity_id === e.id)
      const eBudgets = (budgets ?? []).filter((b: any) => b.entity_id === e.id)
      const eTasks = (tasks ?? []).filter((t: any) => t.entity_id === e.id)
      const eTargets = (targets ?? []).filter((t: any) => t.entity_id === e.id)
      const totalBudget = eBudgets.reduce((s: number, b: any) => s + b.total_amount, 0)
      const usedBudget = eBudgets.reduce((s: number, b: any) => s + b.used_amount, 0)
      return {
        ...e,
        requests: eReqs.length,
        funded: eReqs.filter((r: any) => r.status === 'funded').length,
        rejected: eReqs.filter((r: any) => r.status === 'rejected').length,
        approvalRate: eReqs.length ? Math.round(eReqs.filter((r: any) => r.status === 'funded').length / eReqs.length * 100) : 0,
        budgetUtil: totalBudget > 0 ? Math.round(usedBudget / totalBudget * 100) : 0,
        tasksDone: eTasks.filter((t: any) => t.manager_confirmed).length,
        tasksTotal: eTasks.length,
        avgTarget: eTargets.length ? Math.round(eTargets.reduce((s: number, t: any) => s + t.progress, 0) / eTargets.length) : 0,
      }
    })
    setData(enriched)
  }

  if (!isExec(profile)) return <div className="animate-fade-up"><AccessDenied message="Analytics — Group Executives only" /></div>

  return (
    <div className="animate-fade-up">
      <div className="mb-5 pb-4 border-b border-[#1e2640]">
        <h1 className="font-bebas text-3xl tracking-widest text-white">ANALYTICS</h1>
        <p className="text-xs text-slate-400 mt-1">Branch & subsidiary comparison</p>
      </div>
      <Panel title="BRANCH COMPARISON">
        <Table headers={['BRANCH', 'REQUESTS', 'APPROVAL RATE', 'BUDGET UTIL.', 'TASKS DONE', 'AVG TARGET']}>
          {data.map((b: any) => (
            <Tr key={b.id}>
              <Td><EntityTag name={b.short_name ?? b.name} color={b.brand_color} /></Td>
              <Td><span className="font-bebas text-[16px] text-white">{b.requests}</span></Td>
              <Td><ProgressBar value={b.approvalRate} color="#34d399" /></Td>
              <Td><ProgressBar value={b.budgetUtil} color={b.budgetUtil > 80 ? '#f87171' : b.budgetUtil > 60 ? '#fbbf24' : '#34d399'} /></Td>
              <Td>{b.tasksDone}/{b.tasksTotal}</Td>
              <Td><ProgressBar value={b.avgTarget} color="#d4a84b" /></Td>
            </Tr>
          ))}
        </Table>
      </Panel>
    </div>
  )
}

// ═══════════════════════════════════════════
// HIERARCHY PAGE
// ═══════════════════════════════════════════
export function HierarchyPage() {
  const { profile } = useAuth()
  const [levels, setLevels] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => { if (profile && isExec(profile)) fetchAll() }, [profile])

  const fetchAll = async () => {
    if (!profile) return
    const [lRes, uRes] = await Promise.all([
      supabase.from('hierarchy_levels').select('*').eq('tenant_id', profile.tenant_id).order('rank'),
      supabase.from('user_profiles').select('*, post:posts(*,level:hierarchy_levels(*)), entity:entities(*)').eq('tenant_id', profile.tenant_id),
    ])
    setLevels(lRes.data ?? [])
    setUsers(uRes.data ?? [])
  }

  if (!isExec(profile)) return <div className="animate-fade-up"><AccessDenied message="Org Hierarchy — Group Executives only" /></div>

  const dotColors: Record<number, string> = { 1: '#60a5fa', 2: '#f97316', 3: '#a78bfa', 4: '#94a3b8', 5: '#34d399', 6: '#f472b6' }
  const borderColors: Record<number, string> = { 1: 'border-l-blue-400', 2: 'border-l-orange-400', 3: 'border-l-purple-400', 4: 'border-l-slate-400', 5: 'border-l-emerald-400', 6: 'border-l-pink-400' }

  return (
    <div className="animate-fade-up">
      <div className="mb-5 pb-4 border-b border-[#1e2640]">
        <h1 className="font-bebas text-3xl tracking-widest text-white">ORG HIERARCHY</h1>
        <p className="text-xs text-slate-400 mt-1">Helikon Group structure</p>
      </div>
      <Panel title="HELIKON GROUP STRUCTURE">
        <div className="p-4">
          {levels.map((level: any) => {
            const lvUsers = users.filter((u: any) => u.post?.level_id === level.id)
            if (!lvUsers.length) return null
            return (
              <div key={level.id} className={`mb-4 pl-4 border-l-2 ${borderColors[level.rank] ?? 'border-l-slate-600'}`}>
                <div className="text-[8px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: dotColors[level.rank] }}>
                  Level {level.rank} — {level.name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lvUsers.map((u: any) => (
                    <div key={u.id} className="bg-[#111420] border border-[#1e2640] rounded-md p-2.5 min-w-[150px] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: dotColors[level.rank] }} />
                      <div className="text-[11px] text-white font-semibold">{u.full_name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{u.post?.title}</div>
                      <div className="mt-1.5">{u.entity && <EntityTag name={u.entity.short_name ?? u.entity.name} color={u.entity.brand_color} />}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

export default OversightPage
