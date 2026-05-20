import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { writeAudit } from '@/lib/audit'
import { isAccounting, getApprovalRoute, isStaleRequest, isPettyCash, requiresDualApproval } from '@/lib/permissions'
import { fmtCurrency, fmtDate, statusColor, statusLabel } from '@/lib/format'
import { Panel, Table, Tr, Td, Badge, Button, EntityTag, Modal, FormField, Input, Textarea, Select } from '@/components/shared/UI'
import RequestDetailModal from '@/components/requests/RequestDetailModal'
import type { EnrichedRequest, BreakdownItem, Vendor } from '@/types'

export default function RequestsPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [loading, setLoading] = useState(true)

  // Submit form state
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Operations')
  const [desc, setDesc] = useState('')
  const [just, setJust] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [recurring, setRecurring] = useState('')
  const [bdRows, setBdRows] = useState([{ item: '', qty: '1', unit: '' }])
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (profile) { fetchRequests(); fetchVendors() } }, [profile])

  const fetchRequests = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('funding_requests')
      .select(`*, requester:user_profiles!requester_id(*,post:posts(*,level:hierarchy_levels(*)),entity:entities(*)), entity:entities(*), approvals:request_approvals(*)`)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
    setRequests((data ?? []) as unknown as EnrichedRequest[])
    setLoading(false)
  }

  const fetchVendors = async () => {
    if (!profile) return
    const { data } = await supabase.from('vendors').select('*').eq('tenant_id', profile.tenant_id)
    setVendors((data ?? []) as Vendor[])
  }

  const getVisibleRequests = () => {
    if (!profile) return []
    if (isAccounting(profile)) return requests
    return requests.filter(r => {
      if (r.requester_id === profile.id) return true
      const rp = r.requester?.post
      const mp = profile.post
      if (profile.post?.level?.rank === 1) return true
      if (profile.post?.level?.rank === 2) return rp?.branch_entity_id === mp?.branch_entity_id
      if (profile.post?.level?.rank === 3) return rp?.dept_manager_post_id === mp?.id || r.requester_id === profile.id
      return r.requester_id === profile.id
    })
  }

  const visible = getVisibleRequests()
  const filtered = filter === 'all' ? visible : filter === 'stale' ? visible.filter(r => isStaleRequest(r.created_at, r.status)) : visible.filter(r => r.status === filter)

  const openSubmit = () => {
    setAmount(''); setCategory('Operations'); setDesc(''); setJust(''); setVendorId(''); setRecurring('')
    setBdRows([{ item: '', qty: '1', unit: '' }]); setAttachments([])
    setShowSubmit(true)
  }

  const submitRequest = async () => {
    if (!profile) return
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { alert('Enter a valid amount'); return }
    if (!desc.trim()) { alert('Add a description'); return }
    if (!just.trim()) { alert('Add justification'); return }
    const breakdown = bdRows.filter(r => r.item && parseFloat(r.unit) > 0).map(r => ({ item: r.item, qty: parseInt(r.qty) || 1, unit_price: parseFloat(r.unit) }))
    if (!breakdown.length) { alert('Add at least one breakdown item with a price'); return }

    setSubmitting(true)
    // Count existing requests for ref generation
    const { count } = await supabase.from('funding_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id)
    const ref = `HG-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: newReq } = await db.from('funding_requests').insert({
      tenant_id: profile.tenant_id,
      ref,
      requester_id: profile.id,
      entity_id: profile.entity_id!,
      amount: amt,
      category,
      description: desc,
      justification: just,
      breakdown: breakdown as any,
      attachments: attachments as any,
      vendor_id: vendorId || null,
      recurring: recurring || null,
      is_petty_cash: isPettyCash(amt),
      requires_dual: requiresDualApproval(amt),
      status: 'pending',
    }).select().single()

    if (newReq) {
      await writeAudit({ tenantId: profile.tenant_id, actorId: profile.id, entityType: 'request', entityId: newReq.id, action: 'submitted' })
    }

    setSubmitting(false)
    setShowSubmit(false)
    fetchRequests()
  }

  const routeInfo = () => {
    const amt = parseFloat(amount)
    if (!amt) return 'Enter an amount to see approval route'
    const r = getApprovalRoute(amt)
    return r.label
  }

  const routeColor = () => {
    const amt = parseFloat(amount)
    if (!amt) return 'text-slate-500'
    const r = getApprovalRoute(amt)
    return r.type === 'petty' ? 'text-amber-400' : r.type === 'dual' ? 'text-pink-400' : 'text-blue-400'
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2640]">
        <div>
          <h1 className="font-bebas text-3xl tracking-widest text-white">FUNDING REQUESTS</h1>
          <p className="text-xs text-slate-400 mt-1">
            {profile ? (profile.post?.level?.rank === 1 ? `All group · ${visible.length} visible` : `Within your oversight · ${visible.length} visible`) : ''}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-[#111420] border border-[#1e2640] text-slate-300 text-[10px] px-2 py-1.5 rounded outline-none focus:border-[#d4a84b] appearance-none">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="endorsed">Endorsed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="funded">Funded</option>
            <option value="reserved">Reserved</option>
            <option value="stale">Stale</option>
          </select>
          {!isAccounting(profile) && (
            <Button variant="gold" onClick={openSubmit}>+ New Request</Button>
          )}
        </div>
      </div>

      <Panel title="REQUEST QUEUE" subtitle={`Petty cash <$15: DM approves · Dual approval >$999`}>
        <Table
          headers={['REF', 'FROM', 'SUBSIDIARY', 'DESCRIPTION', 'AMOUNT', 'APPROVALS', 'STATUS', 'DATE', '']}
          empty="No requests found"
        >
          {filtered.map(r => {
            const stale = isStaleRequest(r.created_at, r.status)
            const needed = getApprovalRoute(r.amount).approvalsNeeded
            const apCount = r.is_petty_cash ? 'Petty' : `${r.approvals?.length ?? 0}/${needed}`
            return (
              <Tr key={r.id}>
                <Td>
                  <span className="font-bebas text-[14px] text-[#d4a84b]">{r.ref}</span>
                  {stale && <span className="ml-1.5 text-[8px] text-amber-400 border border-amber-400/30 rounded px-1">STALE</span>}
                </Td>
                <Td>
                  <div className="text-white text-[11px]">{r.requester?.full_name}</div>
                  <div className="text-[9px] text-slate-500">{r.requester?.post?.title}</div>
                </Td>
                <Td>{r.entity && <EntityTag name={r.entity.short_name ?? r.entity.name} color={r.entity.brand_color} />}</Td>
                <Td><span className="max-w-[160px] block truncate">{r.description}</span></Td>
                <Td><span className="text-white font-semibold">{fmtCurrency(r.amount)}</span></Td>
                <Td className="text-[10px]">{apCount}</Td>
                <Td><Badge status={r.status} /></Td>
                <Td className="text-slate-500 text-[10px]">{fmtDate(r.created_at)}</Td>
                <Td><Button variant="blue" size="sm" onClick={() => setSelectedId(r.id)}>View →</Button></Td>
              </Tr>
            )
          })}
        </Table>
      </Panel>

      {/* Submit modal */}
      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="NEW FUNDING REQUEST" wide
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button variant="gold" onClick={submitRequest} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit →'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (USD)">
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" />
          </FormField>
          <FormField label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              {['Operations','Procurement','Maintenance','Payroll','Travel','Emergency','Marketing'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormField>

          {/* Approval route hint */}
          <div className="col-span-2">
            <div className={`text-[10px] ${routeColor()} bg-[#111420] border border-[#1e2640] rounded px-3 py-2`}>
              <span className="font-semibold">Approval Route: </span>{routeInfo()}
            </div>
          </div>

          <div className="col-span-2">
            <FormField label="Brief Description">
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="One-line summary" />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Full Justification">
              <Textarea value={just} onChange={e => setJust(e.target.value)} placeholder="Explain the need, context, expected outcome…" />
            </FormField>
          </div>

          {/* Breakdown */}
          <div className="col-span-2">
            <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Cost Breakdown</div>
            {bdRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_80px_28px] gap-2 mb-2">
                <Input placeholder="Item description" value={row.item} onChange={e => { const r=[...bdRows]; r[i].item=e.target.value; setBdRows(r) }} />
                <Input type="number" placeholder="Qty" value={row.qty} onChange={e => { const r=[...bdRows]; r[i].qty=e.target.value; setBdRows(r) }} min="1" />
                <Input type="number" placeholder="Unit $" value={row.unit} onChange={e => { const r=[...bdRows]; r[i].unit=e.target.value; setBdRows(r) }} min="0" />
                <button onClick={() => setBdRows(bdRows.filter((_, j) => j !== i))} className="bg-red-500/10 text-red-400 rounded text-xs hover:bg-red-500/20 transition-colors">✕</button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setBdRows([...bdRows, { item: '', qty: '1', unit: '' }])}>+ Add Line Item</Button>
          </div>

          <FormField label="Vendor (Optional)">
            <Select value={vendorId} onChange={e => setVendorId(e.target.value)}>
              <option value="">-- No vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}{v.is_verified ? ' ✓' : ' (unverified)'}</option>)}
            </Select>
          </FormField>

          <FormField label="Recurring?">
            <Select value={recurring} onChange={e => setRecurring(e.target.value)}>
              <option value="">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {selectedId && (
        <RequestDetailModal requestId={selectedId} onClose={() => { setSelectedId(null); fetchRequests() }} />
      )}
    </div>
  )
}
