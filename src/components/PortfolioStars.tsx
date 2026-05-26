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

type PortfolioStarsProps = {
  owner?: string
  repo?: string
}

export default function PortfolioStars({ owner = 'sumandey7684', repo = 'portfolio2026' }: PortfolioStarsProps) {
  const [starCount, setStarCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)

  useEffect(() => {
    let isMounted = true
    let isFetching = false
    let nextPollTimer: number | null = null
    const cacheKey = `github-stars:${owner}/${repo}`

    const readCachedStars = () => {
      if (typeof window === 'undefined') {
        return null
      }

      const cachedValue = window.localStorage.getItem(cacheKey)
      if (!cachedValue) {
        return null
      }

      const parsed = Number(cachedValue)
      return Number.isNaN(parsed) ? null : parsed
    }

    const writeCachedStars = (value: number) => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(cacheKey, String(value))
    }

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
        const response = await fetchWithTimeout(`/api/github-stars?owner=${owner}&repo=${repo}`)
        if (!response.ok) {
          let message = `Stars API failed with status ${response.status}`
          try {
            const errorData = (await response.json()) as { error?: unknown }
            if (typeof errorData.error === 'string' && errorData.error.length > 0) {
              message = errorData.error
            }
          } catch {
            // Ignore response parsing errors.
          }
          throw new Error(message)
        }
        const data = await response.json()

        if (isMounted && data.success && typeof data.stars === 'number' && data.stars >= 0) {
          setStarCount(data.stars)
          setIsUnavailable(false)
          writeCachedStars(data.stars)
          return
        }

        throw new Error(data?.error || 'Stars API returned invalid data')
      } catch (error) {
        if (!isAbortLikeError(error)) {
          console.error('Failed to fetch star count:', error)
        }

        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              Accept: 'application/vnd.github+json',
            },
            cache: 'no-store',
          })

          if (!response.ok) {
            throw new Error(`GitHub API failed with status ${response.status}`)
          }

          const data = (await response.json()) as { stargazers_count?: unknown }
          if (typeof data.stargazers_count !== 'number') {
            throw new Error('GitHub API returned invalid data')
          }

          if (isMounted) {
            setStarCount(data.stargazers_count)
            setIsUnavailable(false)
            writeCachedStars(data.stargazers_count)
          }
        } catch (fallbackError) {
          if (!isAbortLikeError(fallbackError)) {
            console.error('Failed to fetch star count from GitHub:', fallbackError)
          }

          if (isMounted) {
            setIsUnavailable(true)
          }
        }
      } finally {
        isFetching = false

        if (isMounted) {
          setLoading(false)
          scheduleNextPoll()
        }
      }
    }

    const cachedStars = readCachedStars()
    if (cachedStars !== null && isMounted) {
      setStarCount(cachedStars)
      setLoading(false)
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
  }, [owner, repo])

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
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors duration-200"
        >
          <FaGithub className="w-4 h-4" />
          <span className="text-sm font-medium">{starCount ?? 0}</span>
        </a>
      </TooltipTrigger>
      <TooltipContent className="bg-neutral-900 text-white px-3 py-1.5 rounded-full text-sm font-medium">
        {isUnavailable ? 'Stars unavailable' : `${starCount ?? 0} stars`}
      </TooltipContent>
    </Tooltip>
  )
}
