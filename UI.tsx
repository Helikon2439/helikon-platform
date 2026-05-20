import React from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { statusLabel, statusColor } from '@/lib/format'

// ── Badge ──────────────────────────────────────────────────
export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={clsx(
      'inline-block text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase',
      statusColor[status] ?? 'bg-slate-500/15 text-slate-400',
      className
    )}>
      {statusLabel[status] ?? status}
    </span>
  )
}

// ── Button ─────────────────────────────────────────────────
type BtnVariant = 'gold' | 'ghost' | 'ok' | 'danger' | 'warn' | 'blue' | 'pink'
const btnVariants: Record<BtnVariant, string> = {
  gold:   'bg-[#d4a84b] hover:bg-[#f0c96a] text-[#07080c]',
  ghost:  'bg-transparent text-slate-400 border border-[#1e2640] hover:border-[#d4a84b] hover:text-[#d4a84b]',
  ok:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
  warn:   'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20',
  pink:   'bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md'
}
export function Button({ variant = 'ghost', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-semibold rounded transition-all uppercase tracking-wide whitespace-nowrap',
        size === 'sm' ? 'text-[9px] px-2.5 py-1' : 'text-[10px] px-3 py-1.5',
        btnVariants[variant],
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Panel ──────────────────────────────────────────────────
export function Panel({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-[#0c0e14] border border-[#1e2640] rounded-lg overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2640] bg-[#111420]">
        <div>
          <h3 className="font-['Bebas_Neue'] text-[13px] tracking-widest text-white">{title}</h3>
          {subtitle && <p className="text-[9px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Table ──────────────────────────────────────────────────
export function Table({ headers, children, empty }: {
  headers: string[]; children: React.ReactNode; empty?: string
}) {
  const hasRows = React.Children.count(children) > 0
  return (
    <div className="overflow-x-auto max-h-96 overflow-y-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="text-[8px] text-slate-500 tracking-[0.2em] uppercase px-4 py-2 text-left border-b border-[#1e2640] bg-[#111420] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : (
            <tr>
              <td colSpan={headers.length} className="text-center py-8 text-slate-500 text-xs">
                {empty ?? 'No records found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={clsx('px-4 py-2.5 text-[11px] text-slate-400 border-b border-[#1e2640] align-middle', className)}>
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={clsx('hover:bg-[#d4a84b]/[0.02] transition-colors', className)}>
      {children}
    </tr>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-[#07080c]/90 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className={clsx(
        'bg-[#0c0e14] border border-[#1e2640] rounded-xl overflow-hidden w-full animate-[fadeUp_0.2s_ease]',
        wide ? 'max-w-3xl' : 'max-w-xl'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2640] bg-[#111420]">
          <h2 className="font-['Bebas_Neue'] text-lg tracking-widest text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#1e2640] bg-[#111420]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Form elements ──────────────────────────────────────────
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[8px] text-slate-500 tracking-[0.2em] uppercase">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-[#111420] border border-[#1e2640] text-white text-[12px] px-2.5 py-2 rounded outline-none focus:border-[#d4a84b] transition-colors font-[Outfit]'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(inputCls, 'resize-y min-h-[70px]')} {...props} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(inputCls, 'appearance-none cursor-pointer')} {...props} />
}

// ── Stat card ─────────────────────────────────────────────
type StatColor = 'gold' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink'
const statColors: Record<StatColor, string> = {
  gold: 'from-[#d4a84b]', blue: 'from-blue-400', green: 'from-emerald-400',
  amber: 'from-amber-400', red: 'from-red-400', purple: 'from-purple-400', pink: 'from-pink-400',
}
export function StatCard({ label, value, meta, color = 'gold' }: {
  label: string; value: string | number; meta?: string; color?: StatColor
}) {
  return (
    <div className="bg-[#0c0e14] border border-[#1e2640] rounded-lg p-4 relative overflow-hidden">
      <div className={clsx('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r to-transparent', statColors[color])} />
      <div className="text-[8px] text-slate-500 tracking-[0.2em] uppercase">{label}</div>
      <div className="font-['Bebas_Neue'] text-3xl text-white mt-1 leading-none">{value}</div>
      {meta && <div className="text-[9px] text-slate-500 mt-1">{meta}</div>}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────
export function ProgressBar({ value, color = '#d4a84b' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#161b28] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="text-[9px] text-slate-400 w-7 text-right">{value}%</span>
    </div>
  )
}

// ── Entity tag ────────────────────────────────────────────
const entityColors: Record<string, string> = {
  '#3b82f6': 'bg-blue-500/15 text-blue-400',
  '#ef4444': 'bg-red-500/15 text-red-400',
  '#10b981': 'bg-emerald-500/15 text-emerald-400',
  '#d4a84b': 'bg-amber-500/15 text-amber-400',
}
export function EntityTag({ name, color }: { name: string; color?: string | null }) {
  const cls = color && entityColors[color] ? entityColors[color] : 'bg-slate-500/15 text-slate-400'
  return (
    <span className={clsx('inline-block text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase', cls)}>
      {name}
    </span>
  )
}

// ── Access denied banner ──────────────────────────────────
export function AccessDenied({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2.5 text-xs text-red-400 flex items-center gap-2 mb-4">
      <span>⊘</span> {message}
    </div>
  )
}

// ── Approval progress slots ───────────────────────────────
export function ApprovalSlots({ needed, approverNames }: { needed: number; approverNames: string[] }) {
  return (
    <div className="bg-[#111420] border border-[#1e2640] rounded-md p-3 my-3">
      <div className="text-[8px] text-slate-500 tracking-widest uppercase mb-2">Approval Progress — {approverNames.length}/{needed}</div>
      <div className="flex gap-2">
        {Array.from({ length: needed }).map((_, i) => {
          const name = approverNames[i]
          return (
            <div key={i} className={clsx(
              'flex-1 rounded p-2 border',
              name ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#161b28] border-[#1e2640]'
            )}>
              <div className="text-[8px] text-slate-500 uppercase tracking-wide">Approval {i + 1}</div>
              <div className={clsx('text-[10px] mt-1', name ? 'text-emerald-400' : 'text-slate-600')}>
                {name ? `✓ ${name}` : 'Awaiting…'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
