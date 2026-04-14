'use client'

import { useEffect, useState } from 'react'
import { FaGithub } from 'react-icons/fa6'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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

export default function PortfolioStars() {
  const [starCount, setStarCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)

  useEffect(() => {
    let isMounted = true
    let isFetching = false
    let nextPollTimer: number | null = null

    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => {
        controller.abort(new DOMException('Request timed out', 'TimeoutError'))
      }, REQUEST_TIMEOUT_MS)

      try {
        return await fetch(url, {
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
        void fetchStars()
      }, REFRESH_INTERVAL_MS)
    }

    const fetchStars = async () => {
      if (isFetching || !isMounted) {
        return
      }

      isFetching = true

      try {
        // Try our API first
        const response = await fetchWithTimeout('/api/github-stars')
        if (!response.ok) {
          throw new Error(`Stars API failed with status ${response.status}`)
        }
        const data = await response.json()

        if (isMounted && data.success && typeof data.stars === 'number' && data.stars >= 0) {
          setStarCount(data.stars)
          setIsUnavailable(false)
        } else {
          if (isMounted) {
            setIsUnavailable(true)
          }
        }
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.error('Failed to fetch star count:', error)
        }

        if (isMounted) {
          setIsUnavailable(true)
        }
      } finally {
        isFetching = false

        if (isMounted) {
          setLoading(false)
          scheduleNextPoll()
        }
      }
    }

    void fetchStars()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void fetchStars()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      isMounted = false
      if (nextPollTimer !== null) {
        window.clearTimeout(nextPollTimer)
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 opacity-50">
        <FaGithub className="w-4 h-4 text-neutral-500" />
        <span className="text-sm text-neutral-500">...</span>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href="https://github.com/sumandey7684/portfolio2026"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors duration-200"
        >
          <FaGithub className="w-4 h-4" />
          <span className="text-sm font-medium">{isUnavailable ? '--' : starCount ?? 0}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent className="bg-neutral-900 text-white px-3 py-1.5 rounded-full text-sm font-medium">
        {isUnavailable ? 'Stars unavailable' : `${starCount ?? 0} stars`}
      </TooltipContent>
    </Tooltip>
  )
}
