import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { writeAudit, writeNotification } from '@/lib/audit'
import {
  isExec, isBranchManager, isDeptManager, isPettyCash,
  getApprovalRoute, isFullyApproved, canEndorseRequests
} from '@/lib/permissions'
import { fmtCurrency, fmtDateTime, statusLabel } from '@/lib/format'
import { Modal, Badge, Button, ApprovalSlots, FormField, Textarea, Input } from '@/components/shared/UI'
import type { EnrichedRequest, BreakdownItem } from '@/types'

interface Props { requestId: string; onClose: () => void }

export default function RequestDetailModal({ requestId, onClose }: Props) {
  const { profile } = useAuth()
  const [req, setReq] = useState<EnrichedRequest | null>(null)
  const [comment, setComment] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [partialAmt, setPartialAmt] = useState('')
  const [partialNote, setPartialNote] = useState('')
  const [mode, setMode] = useState<'view' | 'reject' | 'revision' | 'partial'>('view')
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchReq() }, [requestId])

  const fetchReq = async () => {
    const { data } = await supabase
      .from('funding_requests')
      .select(`
        *, requester:user_profiles!requester_id(*,post:posts(*,level:hierarchy_levels(*)),entity:entities(*)),
        entity:entities(*), vendor:vendors(*),
        approvals:request_approvals(*,approver:user_profiles(*)),
        comments:request_comments(*,author:user_profiles(*)),
        audit:audit_log(*)
      `)
      .eq('id', requestId)
      .single()
    if (data) setReq(data as unknown as EnrichedRequest)
  }

  if (!req || !profile) return null

  const route = getApprovalRoute(req.amount)
  const approverNames = (req.approvals ?? []).map((a: any) => a.approver?.full_name ?? '?')
  const breakdown = (req.breakdown as unknown as BreakdownItem[]) ?? []
  const total = breakdown.reduce((s, b) => s + b.qty * b.unit_price, 0)
  const attachments = (req.attachments as unknown as { name: string; url: string }[]) ?? []
  const audit = req.audit ?? []
  const comments = req.comments ?? []

  // Determine available actions
  const myApprovalIds = (req.approvals ?? []).map((a: any) => a.approver_id)
  const alreadyApproved = myApprovalIds.includes(profile.id)

  const canEndorse = canEndorseRequests(profile) && req.status === 'pending' &&
    req.requester?.post?.dept_manager_post_id === profile.post_id

  const canPettyCashApprove = isDeptManager(profile) && isPettyCash(req.amount) &&
    req.status === 'pending' && req.requester?.post?.dept_manager_post_id === profile.post_id

  const canApprove = (isExec(profile) || isBranchManager(profile)) &&
    req.status === 'endorsed' && !alreadyApproved

  const canRevise = req.status === 'revision' && req.requester_id === profile.id

  const doEndorse = async () => {
    setLoading(true)
    await db.from('funding_requests').update({ status: 'endorsed', endorsed_by: profile.id, endorsed_at: new Date().toISOString() }).eq('id', req.id)
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: 'endorsed — routed to Branch Manager & Executives' })
    setLoading(false); fetchReq()
  }

  const doPettyCashApprove = async () => {
    setLoading(true)
    await db.from('funding_requests').update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() }).eq('id', req.id)
    await db.from('request_approvals').insert({ tenant_id: req.tenant_id, request_id: req.id, approver_id: profile.id })
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: `approved (petty cash < $${15})` })
    setLoading(false); fetchReq()
  }

  const doApprove = async () => {
    setLoading(true)
    await db.from('request_approvals').insert({ tenant_id: req.tenant_id, request_id: req.id, approver_id: profile.id })
    const newCount = (req.approvals?.length ?? 0) + 1
    const needed = route.approvalsNeeded
    if (newCount >= needed) {
      await db.from('funding_requests').update({ status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString() }).eq('id', req.id)
      await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: 'approved (all approvals received) — sent to Accounting' })
    } else {
      await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: `approval ${newCount} of ${needed} received` })
    }
    setLoading(false); fetchReq()
  }

  const doReject = async () => {
    if (rejectReason.trim().length < 20) { alert('Reason must be at least 20 characters'); return }
    setLoading(true)
    await db.from('funding_requests').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', req.id)
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: `rejected — ${rejectReason}` })
    setLoading(false); setMode('view'); onClose()
  }

  const doRevisionRequest = async () => {
    if (!revisionNote.trim()) { alert('Add a revision note'); return }
    setLoading(true)
    await db.from('funding_requests').update({ status: 'revision', revision_note: revisionNote }).eq('id', req.id)
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: `sent back for revision — ${revisionNote}` })
    setLoading(false); setMode('view'); fetchReq()
  }

  const doPartialApprove = async () => {
    const amt = parseFloat(partialAmt)
    if (!amt || amt >= req.amount) { alert('Enter a reduced amount'); return }
    setLoading(true)
    await db.from('funding_requests').update({ amount: amt, partial_amount: amt, partial_note: partialNote, status: 'endorsed', revision_note: `Partial approval: ${fmtCurrency(amt)} approved. ${partialNote}` }).eq('id', req.id)
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: `partial approval — reduced to ${fmtCurrency(amt)}. ${partialNote}` })
    setLoading(false); setMode('view'); fetchReq()
  }

  const doResubmit = async () => {
    setLoading(true)
    await db.from('funding_requests').update({ status: 'pending', endorsed_by: null, endorsed_at: null, revision_note: null }).eq('id', req.id)
    await writeAudit({ tenantId: req.tenant_id, actorId: profile.id, entityType: 'request', entityId: req.id, action: 'resubmitted after revision' })
    setLoading(false); fetchReq()
  }

  const doComment = async () => {
    if (!comment.trim()) return
    await db.from('request_comments').insert({ tenant_id: req.tenant_id, request_id: req.id, author_id: profile.id, body: comment })
    setComment(''); fetchReq()
  }

  return (
    <Modal open title={`${req.ref} — REQUEST DETAIL`} onClose={onClose} wide
      footer={
        mode === 'view' ? (
          <div className="flex items-center gap-2 flex-wrap w-full justify-between">
            <div className="flex gap-2 flex-wrap">
              {canPettyCashApprove && <Button variant="ok" onClick={doPettyCashApprove} disabled={loading}>Approve (Petty Cash)</Button>}
              {canEndorse && !canPettyCashApprove && <>
                <Button variant="ok" onClick={doEndorse} disabled={loading}>Endorse →</Button>
                <Button variant="warn" onClick={() => setMode('revision')}>Send Back</Button>
                <Button variant="danger" onClick={() => setMode('reject')}>Reject</Button>
              </>}
              {canApprove && <>
                <Button variant="ok" onClick={doApprove} disabled={loading}>Approve</Button>
                <Button variant="warn" onClick={() => setMode('partial')}>Partial Approve</Button>
                <Button variant="ghost" onClick={() => setMode('revision')}>Send Back</Button>
                <Button variant="danger" onClick={() => setMode('reject')}>Reject</Button>
              </>}
              {canRevise && <Button variant="gold" onClick={doResubmit} disabled={loading}>Revise & Resubmit →</Button>}
            </div>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        ) : mode === 'reject' ? (
          <div className="w-full space-y-3">
            <FormField label="Reason for Rejection (min 20 characters — required)">
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="This will be visible to the requester and all oversight parties." />
            </FormField>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button variant="danger" onClick={doReject} disabled={loading}>Confirm Rejection</Button>
            </div>
          </div>
        ) : mode === 'revision' ? (
          <div className="w-full space-y-3">
            <FormField label="What needs to change?">
              <Textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)} placeholder="Describe what the requester needs to revise." />
            </FormField>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button variant="warn" onClick={doRevisionRequest} disabled={loading}>Send Back</Button>
            </div>
          </div>
        ) : mode === 'partial' ? (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Approved Amount (USD)">
                <Input type="number" value={partialAmt} onChange={e => setPartialAmt(e.target.value)} placeholder="0.00" />
              </FormField>
              <FormField label="Note to Requester">
                <Input value={partialNote} onChange={e => setPartialNote(e.target.value)} placeholder="Reason for partial amount…" />
              </FormField>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button variant="warn" onClick={doPartialApprove} disabled={loading}>Send Partial Approval</Button>
            </div>
          </div>
        ) : null
      }
    >
      {/* Revision banner */}
      {req.revision_note && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 text-xs text-amber-400 mb-4">
          <strong>Revision Required:</strong> {req.revision_note}
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase">Requested By</div>
          <div className="text-[13px] text-white font-semibold mt-1">{req.requester?.full_name}</div>
          <div className="text-[10px] text-slate-400">{req.requester?.post?.title} · {req.requester?.entity?.name}</div>
        </div>
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase">Status</div>
          <div className="mt-2"><Badge status={req.status} /></div>
        </div>
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase">Category</div>
          <div className="mt-1 flex gap-2 flex-wrap">
            <span className="bg-[#161b28] border border-[#1e2640] rounded text-[9px] text-slate-400 px-2 py-0.5">{req.category}</span>
            {req.recurring && <span className="bg-[#161b28] border border-[#1e2640] rounded text-[9px] text-slate-400 px-2 py-0.5">↻ {req.recurring}</span>}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase">Approval Route</div>
          <div className="text-[10px] text-slate-300 mt-1">{route.label}</div>
        </div>
      </div>

      {/* Approval slots */}
      <ApprovalSlots needed={route.approvalsNeeded} approverNames={approverNames} />

      {/* Description & justification */}
      <div className="text-[8px] text-slate-500 tracking-widest uppercase">Description</div>
      <div className="text-[13px] text-white font-semibold mt-1 mb-3">{req.description}</div>
      <div className="text-[8px] text-slate-500 tracking-widest uppercase">Justification</div>
      <div className="text-[11px] text-slate-300 mt-1 mb-4 leading-relaxed">{req.justification}</div>

      {/* Vendor */}
      {req.vendor && (
        <div className="mb-4">
          <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-1">Vendor</div>
          <div className="text-[11px] text-slate-300">{req.vendor.name} · {req.vendor.category}
            {req.vendor.is_verified
              ? <span className="text-emerald-400 ml-2">✓ Verified</span>
              : <span className="text-amber-400 ml-2">⚠ Unverified</span>}
          </div>
        </div>
      )}

      {/* Cost breakdown */}
      <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Cost Breakdown</div>
      <div className="bg-[#111420] border border-[#1e2640] rounded-md p-3 mb-4">
        {breakdown.map((b, i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-[#1e2640] text-[11px] last:border-0">
            <span className="text-slate-400">{b.item} × {b.qty}</span>
            <span className="text-white">{fmtCurrency(b.qty * b.unit_price)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 text-[12px] font-bold">
          <span className="text-slate-400">TOTAL</span>
          <span className="text-[#d4a84b]">{fmtCurrency(total)}</span>
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-4">
          <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Attachments</div>
          <div className="flex gap-2 flex-wrap">
            {attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                className="bg-[#161b28] border border-[#1e2640] rounded px-2.5 py-1.5 text-[9px] text-slate-400 hover:text-[#d4a84b] hover:border-[#d4a84b] transition-colors">
                📎 {a.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Endorsement / approval trail */}
      <div className="h-px bg-[#1e2640] my-3" />
      <div className="grid grid-cols-2 gap-4 mb-3 text-[11px]">
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-1">Endorsed By</div>
          <div className="text-slate-300">{req.endorsed_by ? (req.requester?.full_name ?? '—') : 'Pending endorsement'}</div>
        </div>
        <div>
          <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-1">Approved By</div>
          <div className="text-slate-300">{req.approved_by ? '—' : 'Pending approval'}</div>
        </div>
      </div>

      {/* Audit trail */}
      <div className="h-px bg-[#1e2640] my-3" />
      <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Audit Trail</div>
      <div className="space-y-1 mb-4">
        {(audit as any[]).map((a, i) => (
          <div key={i} className="flex gap-2 text-[10px] py-1.5 border-b border-[#1e2640] last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4a84b] flex-shrink-0 mt-1" />
            <div className="flex-1">
              <span className="text-white font-semibold">{a.actor_id ?? 'System'} </span>
              <span className="text-slate-400">{a.action}</span>
            </div>
            <div className="text-slate-600 whitespace-nowrap">{a.created_at ? fmtDateTime(a.created_at) : ''}</div>
          </div>
        ))}
      </div>

      {/* Comments */}
      <div className="h-px bg-[#1e2640] my-3" />
      <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Comments</div>
      <div className="space-y-2 mb-3">
        {comments.length === 0 && <div className="text-[11px] text-slate-600">No comments yet.</div>}
        {(comments as any[]).map((c, i) => (
          <div key={i} className="bg-[#111420] border border-[#1e2640] rounded px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-white font-semibold">{c.author?.full_name}</span>
              <span className="text-[9px] text-slate-600">{c.created_at ? fmtDateTime(c.created_at) : ''}</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed">{c.body}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={comment} onChange={e => setComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doComment()}
          placeholder="Add a comment… (Enter to post)"
          className="flex-1 bg-[#111420] border border-[#1e2640] text-white text-[11px] px-3 py-2 rounded outline-none focus:border-[#d4a84b] transition-colors"
        />
        <Button variant="ghost" size="sm" onClick={doComment}>Post</Button>
      </div>
    </Modal>
  )
}
