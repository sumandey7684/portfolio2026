'use client'

import { useEffect, useState } from 'react'
import { getOrCreateVisitorId } from '@/lib/fingerprint'
import { Eye } from 'lucide-react'

interface VisitorStats {
  uniqueVisitors: number
}

const REFRESH_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 10_000

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError' || error.name === 'TimeoutError'
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name
    return name === 'AbortError' || name === 'TimeoutError'
  }

  return false
}

function getOrdinalSuffix(value: number): string {
  const absValue = Math.abs(value)
  const lastTwo = absValue % 100

  if (lastTwo >= 11 && lastTwo <= 13) {
    return 'th'
  }

  switch (absValue % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export function VisitorCount({ className }: { className?: string }) {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let isFetching = false
    let nextPollTimer: number | null = null

    const fetchWithTimeout = async (url: string, init?: RequestInit) => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => {
        controller.abort(new DOMException('Request timed out', 'TimeoutError'))
      }, REQUEST_TIMEOUT_MS)

      try {
        return await fetch(url, {
          ...init,
          cache: 'no-store',
          signal: controller.signal,
        })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    const scheduleNextPoll = () => {
      if (!isMounted) {
        return
      }

      nextPollTimer = window.setTimeout(() => {
        void fetchCurrentStats()
      }, REFRESH_INTERVAL_MS)
    }

    async function fetchCurrentStats() {
      if (isFetching || !isMounted) {
        return
      }

      isFetching = true

      try {
        const response = await fetchWithTimeout('/api/visitors', {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error(`Visitor stats API failed with status ${response.status}`)
        }

        const data = await response.json()
        if (isMounted && data.success && typeof data.uniqueVisitors === 'number') {
          setStats({
            uniqueVisitors: data.uniqueVisitors || 0,
          })
        }
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.error('Failed to fetch visitor stats:', error)
        }
      } finally {
        isFetching = false
        if (isMounted) {
          setLoading(false)
          scheduleNextPoll()
        }
      }
    }

    async function trackAndStartPolling() {
      try {
        const fingerprint = getOrCreateVisitorId()

        await fetchWithTimeout('/api/visitors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fingerprint }),
        })
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.error('Failed to track visitor:', error)
        }
      }

      await fetchCurrentStats()
    }

    void trackAndStartPolling()

    return () => {
      isMounted = false
      if (nextPollTimer !== null) {
        window.clearTimeout(nextPollTimer)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full px-4 py-2">
        <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full px-4 py-2.5 ${className || ''}`}>
      <div className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded flex items-center justify-center">
        <Eye className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
      </div>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        {stats.uniqueVisitors > 0 ? (
          <>
            You are the <span className="font-semibold text-black dark:text-white">{stats.uniqueVisitors.toLocaleString()}<sup className="text-[10px]">{getOrdinalSuffix(stats.uniqueVisitors)}</sup></span> visitor
          </>
        ) : (
          <span className="font-medium text-black dark:text-white">Visitor count unavailable</span>
        )}
      </span>
    </div>
  )
}
