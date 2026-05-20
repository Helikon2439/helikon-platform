import { format, formatDistanceToNow, parseISO, isAfter } from 'date-fns'

export const fmtCurrency = (n: number): string =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (d: string): string =>
  format(parseISO(d), 'dd MMM yyyy')

export const fmtDateTime = (d: string): string =>
  format(parseISO(d), 'dd MMM yyyy, HH:mm')

export const fmtRelative = (d: string): string =>
  formatDistanceToNow(parseISO(d), { addSuffix: true })

export const isOverdue = (dueDate: string): boolean =>
  isAfter(new Date(), parseISO(dueDate))

export const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max)

export const generateRef = (prefix: string, count: number): string =>
  `${prefix}-${String(count).padStart(4, '0')}`

export const truncate = (str: string, len: number): string =>
  str.length > len ? str.slice(0, len) + '…' : str

export const statusLabel: Record<string, string> = {
  pending: 'Pending',
  endorsed: 'Endorsed',
  approved: 'Approved',
  rejected: 'Rejected',
  revision: 'Needs Revision',
  funded: 'Funded',
  reserved: 'Reserved',
  expired: 'Expired',
  open: 'Open',
  inprogress: 'In Progress',
  done: 'Done',
  confirmed: 'Confirmed',
}

export const statusColor: Record<string, string> = {
  pending: 'bg-blue-500/15 text-blue-400',
  endorsed: 'bg-purple-500/15 text-purple-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-400',
  revision: 'bg-orange-500/15 text-orange-400',
  funded: 'bg-emerald-500/20 text-emerald-300',
  reserved: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-slate-500/20 text-slate-400',
  open: 'bg-blue-500/12 text-blue-400',
  inprogress: 'bg-amber-500/15 text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  confirmed: 'bg-emerald-500/20 text-emerald-300',
}

export const priorityColor: Record<string, string> = {
  Normal: 'bg-slate-500/15 text-slate-400',
  High: 'bg-amber-500/15 text-amber-400',
  Urgent: 'bg-red-500/15 text-red-400',
}
