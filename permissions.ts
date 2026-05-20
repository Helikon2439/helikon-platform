import type { EnrichedUser, EnrichedRequest } from '@/types'

export const PETTY_CASH_LIMIT = 15
export const DUAL_APPROVAL_THRESHOLD = 999

// ── Level checks ───────────────────────────────────────────
export const isExec = (u: EnrichedUser | null) =>
  u?.post?.level?.rank === 1

export const isBranchManager = (u: EnrichedUser | null) =>
  u?.post?.level?.rank === 2 && !u?.post?.level?.is_accounting && !u?.post?.level?.is_hr

export const isDeptManager = (u: EnrichedUser | null) =>
  u?.post?.level?.rank === 3

export const isStaff = (u: EnrichedUser | null) =>
  u?.post?.level?.rank === 4

export const isAccounting = (u: EnrichedUser | null) =>
  u?.post?.level?.is_accounting === true

export const isHR = (u: EnrichedUser | null) =>
  u?.post?.level?.is_hr === true

export const canApproveRequests = (u: EnrichedUser | null) =>
  isExec(u) || isBranchManager(u)

export const canEndorseRequests = (u: EnrichedUser | null) =>
  isDeptManager(u)

export const canSeeHierarchy = (u: EnrichedUser | null) =>
  isExec(u)

export const canSeeBudgets = (u: EnrichedUser | null) =>
  isExec(u) || isBranchManager(u) || isAccounting(u)

export const canAssignTasks = (u: EnrichedUser | null) =>
  !isStaff(u) && !isAccounting(u) && !isHR(u)

export const canSetTargets = (u: EnrichedUser | null) =>
  canAssignTasks(u)

// ── Request routing rules ──────────────────────────────────
export const isPettyCash = (amount: number) => amount < PETTY_CASH_LIMIT

export const requiresDualApproval = (amount: number) => amount > DUAL_APPROVAL_THRESHOLD

export const getApprovalRoute = (amount: number): {
  type: 'petty' | 'standard' | 'dual'
  label: string
  approvalsNeeded: number
} => {
  if (isPettyCash(amount)) return {
    type: 'petty',
    label: `Under $${PETTY_CASH_LIMIT} — Dept Manager approves directly`,
    approvalsNeeded: 1,
  }
  if (requiresDualApproval(amount)) return {
    type: 'dual',
    label: `Over $${DUAL_APPROVAL_THRESHOLD} — 2 approvals required`,
    approvalsNeeded: 2,
  }
  return {
    type: 'standard',
    label: 'Branch Manager or Executive approves',
    approvalsNeeded: 1,
  }
}

export const isFullyApproved = (req: EnrichedRequest): boolean => {
  const needed = getApprovalRoute(req.amount).approvalsNeeded
  return (req.approvals?.length ?? 0) >= needed
}

// ── Oversight: can user A oversee user B? ─────────────────
export const canOversee = (
  viewer: EnrichedUser | null,
  subject: EnrichedUser | null
): boolean => {
  if (!viewer || !subject) return false
  if (viewer.id === subject.id) return false
  if (isExec(viewer) || isHR(viewer)) return true
  if (isAccounting(viewer)) return false

  const viewerPost = viewer.post
  const subjectPost = subject.post

  if (isBranchManager(viewer)) {
    return (
      viewerPost?.branch_entity_id !== null &&
      viewerPost?.branch_entity_id === subjectPost?.branch_entity_id &&
      (subjectPost?.level?.rank ?? 0) > (viewerPost?.level?.rank ?? 0)
    )
  }

  if (isDeptManager(viewer)) {
    return (
      viewerPost?.branch_entity_id === subjectPost?.branch_entity_id &&
      subjectPost?.dept_manager_post_id === viewerPost?.id
    )
  }

  return false
}

// ── Stale / expired request checks ────────────────────────
export const isStaleRequest = (createdAt: string, status: string): boolean => {
  if (['funded', 'rejected', 'reserved', 'expired'].includes(status)) return false
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days > 14
}

// ── Overdue task check ────────────────────────────────────
export const isOverdueTask = (dueDate: string, status: string): boolean => {
  if (status === 'done' || status === 'confirmed') return false
  return new Date(dueDate) < new Date()
}
