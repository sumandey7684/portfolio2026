'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { ActivityCalendar } from 'react-activity-calendar'

type ActivityDay = {
  date: string
  count: number
  level: number
}

type LeetCodeActivityProps = {
  username?: string
}

type CachePayload = {
  updatedAt: number
  data: ActivityDay[]
  total: number
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 6

function toDateKeyUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


function getLevel(count: number, maxCount: number): number {
  if (count <= 0) return 0
  const normalized = Math.ceil((count / Math.max(1, maxCount)) * 4)
  return Math.min(Math.max(normalized, 1), 4)
}

export default function LeetCodeActivity({ username = 'suman_dey' }: LeetCodeActivityProps) {
  const { resolvedTheme } = useTheme()
  const [data, setData] = useState<ActivityDay[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(() => new Date().getFullYear())

  const currentYear = new Date().getFullYear()

  const calendarTheme = useMemo(
    () => ({
      light: ['#f5f5f5', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'],
      dark: ['#262626', '#14532d', '#15803d', '#22c55e', '#4ade80'],
    }),
    []
  )

  const colorScheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    let isMounted = true
    const cacheKey = `leetcode-activity:${username}:${selectedYear ?? 'last12'}`

    const readCache = () => {
      if (typeof window === 'undefined') return null
      try {
        const raw = window.localStorage.getItem(cacheKey)
        if (!raw) return null
        const parsed = JSON.parse(raw) as CachePayload
        if (!parsed || typeof parsed.updatedAt !== 'number') return null
        if (Date.now() - parsed.updatedAt > CACHE_TTL_MS) return null
        return parsed
      } catch {
        return null
      }
    }

    const writeCache = (payload: CachePayload) => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(payload))
      } catch {
        // Ignore cache write errors.
      }
    }

    const buildCalendar = (calendar: Record<string, number>, rangeStart: Date, rangeEnd: Date) => {
      const calendarByDate: Record<string, number> = {}
      Object.entries(calendar).forEach(([timestamp, count]) => {
        const date = new Date(Number(timestamp) * 1000)
        const dateKey = toDateKeyUTC(date)
        calendarByDate[dateKey] = count
      })

      const days: ActivityDay[] = []
      const cursor = new Date(rangeStart)
      let maxCount = 0
      let totalCount = 0

      while (cursor <= rangeEnd) {
        const dateKey = toDateKeyUTC(cursor)
        const count = calendarByDate[dateKey] ?? 0
        maxCount = Math.max(maxCount, count)
        totalCount += count
        days.push({ date: dateKey, count, level: 0 })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }

      const normalized = days.map((day) => ({
        ...day,
        level: getLevel(day.count, maxCount),
      }))

      return { days: normalized, totalCount }
    }

    const fetchActivity = async () => {
      try {
        setLoading(true)

        const yearQuery = selectedYear ? `&year=${selectedYear}` : ''
        const response = await fetch(`/api/leetcode-activity?username=${username}${yearQuery}`)
        if (!response.ok) {
          const message = `LeetCode API failed with status ${response.status}`
          throw new Error(message)
        }

        const payload = (await response.json()) as { success?: boolean; calendar?: Record<string, number> }
        if (!payload.success || !payload.calendar) {
          throw new Error('Invalid LeetCode response')
        }

        const now = new Date()
        const endDateUtc = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        ))
        let rangeStart = new Date(endDateUtc)
        let rangeEnd = new Date(endDateUtc)

        if (selectedYear) {
          rangeStart = new Date(Date.UTC(selectedYear, 0, 1))
          rangeEnd = selectedYear === currentYear
            ? endDateUtc
            : new Date(Date.UTC(selectedYear, 11, 31))
        } else {
          rangeStart.setUTCDate(rangeStart.getUTCDate() - 364)
        }

        const { days, totalCount } = buildCalendar(payload.calendar, rangeStart, rangeEnd)

        if (isMounted) {
          setData(days)
          setTotal(totalCount)
          setError(null)
          writeCache({ updatedAt: Date.now(), data: days, total: totalCount })
        }
      } catch (err) {
        console.error('LeetCode fetch failed:', err)
        if (isMounted) {
          setError('LeetCode activity unavailable')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const cached = readCache()
    if (cached && isMounted) {
      setData(cached.data)
      setTotal(cached.total)
      setLoading(false)
    }

    void fetchActivity()

    return () => {
      isMounted = false
    }
  }, [username, selectedYear, currentYear])

  const yearOptions = Array.from({ length: currentYear - 2015 }, (_, index) => currentYear - index)
  const headingText = selectedYear === null ? 'Last 12 Months' : `${selectedYear}`

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Featured</p>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-1">Leetcode Activity</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{headingText}</p>
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
          <div className="h-27.5 sm:h-[130px] bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Featured</p>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-1">Leetcode Activity</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{headingText}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <p className="text-neutral-500 dark:text-neutral-400 text-center">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Featured</p>
        <h3 className="text-xl font-semibold text-black dark:text-white mb-1">Leetcode Activity</h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {headingText} • Total:{' '}
            <span className="font-semibold text-black dark:text-white">{total.toLocaleString()}</span> submissions
          </p>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span>View</span>
            <select
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              value={selectedYear ?? 'last12'}
              onChange={(event) => {
                const value = event.target.value
                setSelectedYear(value === 'last12' ? null : Number(value))
              }}
            >
              <option value="last12">Last 12 months</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 shadow-sm"
        role="img"
        aria-label={`LeetCode contribution graph showing ${total} submissions for ${headingText}`}
      >
        <div className="w-full overflow-x-auto">
          <ActivityCalendar
            data={data}
            theme={calendarTheme}
            colorScheme={colorScheme}
            blockSize={12}
            blockMargin={2}
            blockRadius={2}
            fontSize={10}
            showWeekdayLabels={false}
            showTotalCount={false}
            hideColorLegend
          />
        </div>

        <div className="flex items-center justify-end mt-4 gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="w-2.5 h-[10px] sm:w-[12px] sm:h-[12px] rounded-[2px]"
                style={{ backgroundColor: calendarTheme[colorScheme][level] }}
              />
            ))}
          </div>
          <span>More</span>
        </div>

      </div>
    </div>
  )
}