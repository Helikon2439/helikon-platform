import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, db } from '@/lib/supabase'
import { isExec, isAccounting, canOversee, getApprovalRoute, isStaleRequest } from '@/lib/permissions'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { StatCard, Panel, Table, Tr, Td, Badge, Button, EntityTag, ProgressBar } from '@/components/shared/UI'
import type { EnrichedRequest, EnrichedTask, EnrichedUser } from '@/types'
import RequestDetailModal from '@/components/requests/RequestDetailModal'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [tasks, setTasks] = useState<EnrichedTask[]>([])
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    fetchData()
    // Realtime
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funding_requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile])

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)

    const [reqRes, taskRes] = await Promise.all([
      supabase.from('funding_requests').select(`
        *, requester:user_profiles!requester_id(*,post:posts(*,level:hierarchy_levels(*)),entity:entities(*)),
        entity:entities(*), vendor:vendors(*),
        approvals:request_approvals(*), comments:request_comments(*), audit:audit_log(*)
      `).eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),

      supabase.from('tasks').select(`
        *, assignedByUser:user_profiles!assigned_by(*), assignedToUser:user_profiles!assigned_to(*)
      `).eq('tenant_id', profile.tenant_id)
        .or(`assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`)
        .order('due_date', { ascending: true }),
    ])

    setRequests((reqRes.data ?? []) as unknown as EnrichedRequest[])
    setTasks((taskRes.data ?? []) as unknown as EnrichedTask[])
    setLoading(false)
  }

  if (!profile || loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[#d4a84b] font-bebas text-xl tracking-widest animate-pulse">Loading…</div>
    </div>
  )

  const visibleReqs = requests.filter(r =>
    r.requester_id === profile.id ||
    isExec(profile) ||
    isAccounting(profile) ||
    canOversee(profile, r.requester as EnrichedUser)
  )

  const actionableReqs = visibleReqs.filter(r => {
    if (r.status === 'pending' && profile.post?.level?.can_endorse && !profile.post?.level?.can_approve) {
      return r.requester?.post?.dept_manager_post_id === profile.post_id
    }
    if (r.status === 'endorsed' && profile.post?.level?.can_approve) return true
    return false
  })

  const staleReqs = visibleReqs.filter(r => isStaleRequest(r.created_at, r.status))
  const myActiveTasks = tasks.filter(t => t.assigned_to === profile.id && t.status !== 'confirmed')
  const tasksToConfirm = tasks.filter(t => t.assigned_by === profile.id && t.status === 'done' && !t.manager_confirmed)

  const funded = visibleReqs.filter(r => r.status === 'funded').length
  const totalValue = visibleReqs.reduce((s, r) => s + r.amount, 0)

  const title = isExec(profile) ? 'GROUP COMMAND' : profile.entity?.name?.toUpperCase() ?? 'DASHBOARD'
  const subtitle = isExec(profile) ? 'Helikon Group · All subsidiaries' : `${profile.post?.title} · ${profile.entity?.name}`

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-5 pb-4 border-b border-[#1e2640]">
        <h1 className="font-bebas text-3xl tracking-widest text-white">{title}</h1>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Requests Visible" value={visibleReqs.length} meta={`${actionableReqs.length} need action`} color="blue" />
        <StatCard label="Active Tasks" value={myActiveTasks.length} meta="Assigned to me" color="amber" />
        <StatCard label="Funded" value={funded} meta="Disbursed requests" color="green" />
        <StatCard label="Total Value" value={fmtCurrency(totalValue)} meta="All visible requests" color="gold" />
      </div>

      {/* Actionable requests */}
      {actionableReqs.length > 0 && (
        <Panel title="⚡ AWAITING YOUR ACTION" subtitle={`${actionableReqs.length} item${actionableReqs.length > 1 ? 's' : ''}`}>
          <Table headers={['REF', 'FROM', 'DESCRIPTION', 'AMOUNT', 'ROUTE', '']}>
            {actionableReqs.map(r => {
              const route = getApprovalRoute(r.amount)
              const routeColors = { petty: 'bg-amber-500/15 text-amber-400', standard: 'bg-blue-500/15 text-blue-400', dual: 'bg-pink-500/15 text-pink-400' }
              return (
                <Tr key={r.id}>
                  <Td><span className="font-bebas text-[14px] text-[#d4a84b]">{r.ref}</span></Td>
                  <Td><div className="text-white text-[11px]">{r.requester?.full_name}</div></Td>
                  <Td><span className="max-w-[180px] block truncate">{r.description}</span></Td>
                  <Td><span className="text-white font-semibold">{fmtCurrency(r.amount)}</span></Td>
                  <Td>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase ${routeColors[route.type]}`}>
                      {route.type === 'petty' ? 'Petty' : route.type === 'dual' ? 'Dual' : 'Standard'}
                    </span>
                  </Td>
                  <Td>
                    <Button variant="blue" size="sm" onClick={() => setSelectedReqId(r.id)}>View →</Button>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        </Panel>
      )}

      {/* Tasks to confirm */}
      {tasksToConfirm.length > 0 && (
        <Panel title="✓ TASKS TO CONFIRM" subtitle="Marked done — awaiting your confirmation">
          <Table headers={['TASK', 'ASSIGNED TO', 'DUE', '']}>
            {tasksToConfirm.map(t => (
              <Tr key={t.id}>
                <Td><span className="text-white">{t.title}</span></Td>
                <Td>{(t.assignedToUser as EnrichedUser)?.full_name}</Td>
                <Td className="text-slate-500">{fmtDate(t.due_date)}</Td>
                <Td>
                  <Button variant="ok" size="sm" onClick={async () => {
                    await db.from('tasks').update({ manager_confirmed: true, status: 'confirmed' }).eq('id', t.id)
                    fetchData()
                  }}>Confirm</Button>
                </Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {/* Stale requests */}
      {staleReqs.length > 0 && (
        <Panel title="⚠ STALE REQUESTS" subtitle={`No action for 14+ days`}>
          <Table headers={['REF', 'FROM', 'DESCRIPTION', 'SUBMITTED', '']}>
            {staleReqs.map(r => (
              <Tr key={r.id}>
                <Td><span className="font-bebas text-[14px] text-amber-400">{r.ref}</span></Td>
                <Td>{r.requester?.full_name}</Td>
                <Td><span className="truncate block max-w-[200px]">{r.description}</span></Td>
                <Td className="text-slate-500">{fmtDate(r.created_at)}</Td>
                <Td><Button variant="blue" size="sm" onClick={() => setSelectedReqId(r.id)}>View</Button></Td>
              </Tr>
            ))}
          </Table>
        </Panel>
      )}

      {/* My active tasks */}
      {myActiveTasks.length > 0 && (
        <Panel title="MY ACTIVE TASKS">
          <Table headers={['TASK', 'FROM', 'DUE', 'PROGRESS', '']}>
            {myActiveTasks.map(t => {
              const overdue = new Date(t.due_date) < new Date() && t.status !== 'done'
              return (
                <Tr key={t.id}>
                  <Td><span className="text-white">{t.title}</span></Td>
                  <Td className="text-[10px]">{(t.assignedByUser as EnrichedUser)?.full_name}</Td>
                  <Td className={overdue ? 'text-red-400' : 'text-slate-500'}>{fmtDate(t.due_date)}</Td>
                  <Td><ProgressBar value={t.progress} /></Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const pct = parseInt(prompt(`Progress for "${t.title}" (current: ${t.progress}%)\n0–100:`) ?? '')
                      if (isNaN(pct) || pct < 0 || pct > 100) return
                      await db.from('tasks').update({
                        progress: pct,
                        status: pct === 100 ? 'done' : pct > 0 ? 'inprogress' : 'open'
                      }).eq('id', t.id)
                      fetchData()
                    }}>Update</Button>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        </Panel>
      )}

      {actionableReqs.length === 0 && tasksToConfirm.length === 0 && staleReqs.length === 0 && myActiveTasks.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-3xl mb-3">◈</div>
          <div className="text-sm">No pending actions. All clear.</div>
        </div>
      )}

      {selectedReqId && (
        <RequestDetailModal
          requestId={selectedReqId}
          onClose={() => { setSelectedReqId(null); fetchData() }}
        />
      )}
    </div>
  )
}
