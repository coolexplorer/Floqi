'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Sun, Mail, BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AutomationCard, type Automation, type AutomationStatus } from '@/components/cards/AutomationCard'
import { FilterBar, type AutomationStatus as FilterStatus } from '@/components/filters/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'

interface RawAutomation {
  id: string
  name: string
  template_type: string
  status: string
  last_run_at: string | null
  next_run_at: string | null
  schedule_cron: string | null
}

const templateIconMap: Record<string, LucideIcon> = {
  morning_briefing: Sun,
  email_triage: Mail,
  reading_digest: BookOpen,
}

function toAutomation(raw: RawAutomation): Automation {
  return {
    id: raw.id,
    name: raw.name,
    templateIcon: templateIconMap[raw.template_type] ?? Zap,
    status: (raw.status as AutomationStatus) ?? 'paused',
    lastRun: raw.last_run_at ?? undefined,
    nextRun: raw.next_run_at ?? undefined,
    schedule: raw.schedule_cron ?? undefined,
  }
}

export default function AutomationsPage() {
  const router = useRouter()
  const [automations, setAutomations] = React.useState<Automation[]>([])
  const [filtered, setFiltered] = React.useState<Automation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const notificationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function showNotification(message: string, type: 'success' | 'error') {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current)
    setNotification({ message, type })
    notificationTimerRef.current = setTimeout(() => setNotification(null), 5000)
  }

  React.useEffect(() => {
    async function fetchAutomations() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('automations')
        .select('id, name, template_type, status, last_run_at, next_run_at, schedule_cron')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const list = (data as RawAutomation[] | null ?? []).map(toAutomation)
      setAutomations(list)
      setFiltered(list)
      setLoading(false)
    }
    fetchAutomations()
  }, [])

  function handleSearch(query: string) {
    const q = query.toLowerCase()
    setFiltered(
      automations.filter((a) => a.name.toLowerCase().includes(q))
    )
  }

  function handleStatusChange(status: FilterStatus) {
    if (status === 'all') {
      setFiltered(automations)
    } else {
      setFiltered(automations.filter((a) => a.status === status))
    }
  }

  function handleDateChange(range: { from: string; to: string } | null) {
    if (!range) {
      setFiltered(automations)
      return
    }
    setFiltered(
      automations.filter((a) => {
        if (!a.nextRun) return false
        const runDate = a.nextRun.slice(0, 10)
        return runDate >= range.from && runDate <= range.to
      })
    )
  }

  async function handleToggle(id: string, newStatus: 'active' | 'paused') {
    const prevAutomations = automations
    const prevFiltered = filtered

    // Optimistic update
    const applyUpdate = (prev: Automation[]) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    setAutomations(applyUpdate)
    setFiltered(applyUpdate)

    let fetchAvailable = true
    let fetchOk = false
    let fetchError: string | null = null

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchOk = res.ok
      if (!res.ok) {
        const data = await res.json()
        fetchError = (data as { error?: string }).error ?? 'Failed to update'
      }
    } catch {
      fetchAvailable = false
    }

    if (!fetchAvailable) {
      // API not reachable — fall back to direct Supabase call
      const supabase = createClient()
      await supabase.from('automations').update({ status: newStatus }).eq('id', id)
      return
    }

    if (!fetchOk) {
      // API returned error — roll back optimistic update
      setAutomations(prevAutomations)
      setFiltered(prevFiltered)
      showNotification(fetchError ?? 'Failed to update', 'error')
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id)
  }

  async function confirmDelete() {
    if (!deleteTargetId) return
    const id = deleteTargetId

    let fetchAvailable = true
    let fetchOk = false
    let fetchError: string | null = null

    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
      fetchOk = res.ok
      if (!res.ok) {
        const data = await res.json()
        fetchError = (data as { error?: string }).error ?? 'Failed to delete'
      }
    } catch {
      fetchAvailable = false
    }

    if (!fetchAvailable) {
      // API not reachable — fall back to direct Supabase call
      const supabase = createClient()
      await supabase.from('automations').delete().eq('id', id)
      setAutomations((prev) => prev.filter((a) => a.id !== id))
      setFiltered((prev) => prev.filter((a) => a.id !== id))
      setDeleteTargetId(null)
      return
    }

    if (!fetchOk) {
      setDeleteTargetId(null)
      showNotification(fetchError ?? 'Failed to delete', 'error')
      return
    }

    // Success
    setAutomations((prev) => prev.filter((a) => a.id !== id))
    setFiltered((prev) => prev.filter((a) => a.id !== id))
    setDeleteTargetId(null)
    showNotification('자동화가 삭제 완료되었습니다', 'success')
  }

  function cancelDelete() {
    setDeleteTargetId(null)
  }

  function handleEdit(id: string) {
    router.push(`/automations/${id}/edit`)
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-24 text-sm text-slate-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Automations</h1>
        <Link
          href="/automations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          Create Automation
        </Link>
      </div>

      {/* Filter bar */}
      <FilterBar
        onSearch={handleSearch}
        onStatusChange={handleStatusChange}
        onDateChange={handleDateChange}
      />

      {/* Content */}
      {automations.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automations yet"
          description="Create your first automation to start saving time on repetitive tasks."
          actionLabel="Create Automation"
          onAction={() => router.push('/automations/new')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No results"
          description="Try adjusting your search or filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteTargetId !== null}
        onClose={cancelDelete}
        title="자동화 삭제"
        size="sm"
      >
        <p className="text-sm text-slate-600">
          이 자동화를 삭제하시겠습니까? 모든 실행 기록이 함께 삭제됩니다.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelDelete}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            확인
          </button>
        </div>
      </Modal>
    </div>
  )
}
