import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { isExec, isAccounting, isHR, isBranchManager, isStaff } from '@/lib/permissions'

const levelColors: Record<number, string> = {
  1: '#60a5fa', 2: '#f97316', 3: '#a78bfa', 4: '#94a3b8', 5: '#34d399', 6: '#f472b6',
}
const levelTags: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-400',
  2: 'bg-orange-500/10 text-orange-400',
  3: 'bg-purple-500/10 text-purple-400',
  4: 'bg-slate-500/10 text-slate-400',
  5: 'bg-emerald-500/10 text-emerald-400',
  6: 'bg-pink-500/10 text-pink-400',
}

interface NavItem {
  to: string; label: string; icon: string; badge?: number
}

export default function Sidebar({ pendingCount }: { pendingCount: number }) {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  const rank = profile.post?.level?.rank ?? 4
  const dot = levelColors[rank] ?? '#94a3b8'
  const tag = levelTags[rank] ?? levelTags[4]
  const levelName = profile.post?.level?.name ?? 'Staff'

  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/requests', label: 'Funding Requests', icon: '↑', badge: pendingCount },
    ...(!isAccounting(profile) ? [{ to: '/tasks', label: 'Tasks', icon: '✓' }] : []),
    ...(!isAccounting(profile) ? [{ to: '/targets', label: 'Targets', icon: '◎' }] : []),
    ...(!isStaff(profile) && !isAccounting(profile) ? [{ to: '/oversight', label: 'Oversight', icon: '◫' }] : []),
    { to: '/hr', label: 'HR', icon: '♡' },
    ...(isAccounting(profile) || isExec(profile) || isBranchManager(profile) ? [{ to: '/accounting', label: 'Accounting', icon: '$' }] : []),
    ...(isExec(profile) ? [{ to: '/analytics', label: 'Analytics', icon: '≡' }] : []),
    ...(isExec(profile) ? [{ to: '/hierarchy', label: 'Org Hierarchy', icon: '⬡' }] : []),
  ]

  return (
    <aside className="w-60 min-w-[240px] h-screen bg-[#0c0e14] border-r border-[#1e2640] flex flex-col overflow-hidden z-10">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1e2640]">
        <div className="font-['Bebas_Neue'] text-xl tracking-[0.12em] text-[#d4a84b]">⬡ HELIKON</div>
        <div className="text-[8px] text-slate-600 tracking-[0.25em] uppercase mt-0.5">Group Command System</div>
      </div>

      {/* Current user */}
      <div className="px-4 py-3 border-b border-[#1e2640] bg-[#111420]">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: dot, boxShadow: `0 0 5px ${dot}` }} />
          <div className="min-w-0">
            <div className="text-[11px] text-white font-semibold truncate">{profile.full_name}</div>
            <div className="text-[9px] text-slate-400 mt-0.5 truncate">{profile.post?.title} · {profile.entity?.short_name ?? profile.entity?.name}</div>
            <span className={clsx('inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 tracking-widest uppercase', tag)}>{levelName}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
        <div className="text-[8px] text-slate-600 tracking-[0.22em] uppercase px-4 py-2 mt-1">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-2 px-4 py-2 text-[12px] cursor-pointer transition-all border-l-2',
              isActive
                ? 'text-[#d4a84b] bg-[#d4a84b]/10 border-[#d4a84b]'
                : 'text-slate-400 border-transparent hover:text-white hover:bg-[#d4a84b]/[0.04]'
            )}
          >
            <span className="text-[13px] w-4 text-center flex-shrink-0">{item.icon}</span>
            {item.label}
            {item.badge ? (
              <span className="ml-auto bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-[#1e2640]">
        <button
          onClick={signOut}
          className="w-full text-[10px] text-slate-500 hover:text-red-400 transition-colors text-left tracking-wide uppercase"
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  )
}
