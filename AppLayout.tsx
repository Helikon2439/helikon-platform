import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AppLayout() {
  const { profile } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Track online status
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Count pending actions for badge
  useEffect(() => {
    if (!profile) return
    const fetchPending = async () => {
      const { count } = await supabase
        .from('funding_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'endorsed'])
        .eq('tenant_id', profile.tenant_id)
      setPendingCount(count ?? 0)
    }
    fetchPending()

    // Realtime subscription for live badge updates
    const channel = supabase
      .channel('pending-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funding_requests' }, fetchPending)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  return (
    <div className="flex h-screen overflow-hidden bg-[#07080c]">
      <Sidebar pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto">
        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400 flex items-center gap-2">
            <span>⚠</span> You are offline. Actions will sync automatically when reconnected.
          </div>
        )}
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
