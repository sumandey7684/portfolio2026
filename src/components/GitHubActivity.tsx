'use client'

import { useEffect, useState } from 'react'

interface ContributionDay {
    date: string
    count: number
    level: number
}

interface ContributionWeek {
    contributionDays: ContributionDay[]
}

interface GitHubActivityProps {
    username?: string
}

const BLOCK_SIZE_PX = 12
const EXPECTED_WEEKS = 53

function toDateKeyUTC(date: Date): string {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export default function GitHubActivity({ username = 'sumandey7684' }: GitHubActivityProps) {
    const [contributions, setContributions] = useState<ContributionWeek[]>([])
    const [totalContributions, setTotalContributions] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedYear, setSelectedYear] = useState<number | null>(() => new Date().getFullYear())

    const currentYear = new Date().getFullYear()

    useEffect(() => {
        const fetchContributions = async () => {
            try {
                setLoading(true)

                const fetchYear = async (year: number) => {
                    const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=${year}`)
                    if (!response.ok) {
                        throw new Error('Failed to fetch contributions')
                    }
                    const data = await response.json()
                    if (!Array.isArray(data?.contributions)) {
                        throw new Error('Invalid contribution payload')
                    }
                    return data.contributions as { date: string; count: number; level: number }[]
                }

                let allContributions: { date: string; count: number; level: number }[] = []

                const today = new Date()
                const todayUtc = new Date(Date.UTC(
                    today.getUTCFullYear(),
                    today.getUTCMonth(),
                    today.getUTCDate()
                ))
                let rangeStart = new Date(todayUtc)
                let rangeEnd = new Date(todayUtc)

                if (selectedYear === null) {
                    const [currentYearData, previousYearData] = await Promise.all([
                        fetchYear(currentYear),
                        fetchYear(currentYear - 1)
                    ])

                    rangeStart.setUTCDate(rangeStart.getUTCDate() - 364)
                    allContributions = [...previousYearData, ...currentYearData]
                } else {
                    const yearData = await fetchYear(selectedYear)
                    rangeStart = new Date(Date.UTC(selectedYear, 0, 1))
                    rangeEnd = new Date(Date.UTC(selectedYear, 11, 31))
                    allContributions = yearData
                }

                const contributionsByDate = new Map<string, ContributionDay>()
                allContributions.forEach((day) => {
                    contributionsByDate.set(day.date, {
                        date: day.date,
                        count: day.count,
                        level: day.level
                    })
                })

                const daysInRange: ContributionDay[] = []
                const cursor = new Date(rangeStart)
                let total = 0

                while (cursor <= rangeEnd) {
                    const dateKey = toDateKeyUTC(cursor)
                    const entry = contributionsByDate.get(dateKey)
                    const count = entry?.count ?? 0
                    const level = entry?.level ?? 0
                    total += count
                    daysInRange.push({
                        date: dateKey,
                        count,
                        level,
                    })
                    cursor.setUTCDate(cursor.getUTCDate() + 1)
                }

                const weeks: ContributionWeek[] = []
                let currentWeek: ContributionDay[] = []
                let isFirstDay = true

                daysInRange.forEach((day) => {
                    const date = new Date(`${day.date}T00:00:00Z`)
                    const dayOfWeek = date.getUTCDay()

                    if (isFirstDay && dayOfWeek !== 0) {
                        for (let i = 0; i < dayOfWeek; i++) {
                            currentWeek.push({
                                date: '',
                                count: 0,
                                level: 0
                            })
                        }
                        isFirstDay = false
                    }
                    isFirstDay = false

                    if (dayOfWeek === 0 && currentWeek.length > 0) {
                        weeks.push({ contributionDays: currentWeek })
                        currentWeek = []
                    }

                    currentWeek.push(day)
                })

                if (currentWeek.length > 0) {
                    while (currentWeek.length < 7) {
                        currentWeek.push({
                            date: '',
                            count: 0,
                            level: 0
                        })
                    }
                    weeks.push({ contributionDays: currentWeek })
                }

                while (weeks.length < EXPECTED_WEEKS) {
                    weeks.push({
                        contributionDays: Array.from({ length: 7 }).map(() => ({
                            date: '',
                            count: 0,
                            level: 0
                        }))
                    })
                }

                setContributions(weeks)
                setTotalContributions(total)
                setError(null)
            } catch (err) {
                setError('Failed to load GitHub activity')
                console.error('Error fetching GitHub contributions:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchContributions()
    }, [username, selectedYear, currentYear])

    const getContributionColor = (level: number) => {
        const colors = {
            light: [
                'bg-neutral-100',
                'bg-green-200',
                'bg-green-300',
                'bg-green-400',
                'bg-green-600'
            ],
            dark: [
                'dark:bg-neutral-800',
                'dark:bg-green-900',
                'dark:bg-green-700',
                'dark:bg-green-500',
                'dark:bg-green-400'
            ]
        }
        return `${colors.light[level]} ${colors.dark[level]}`
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const getMonthLabels = () => {
        if (contributions.length === 0) return []

        const labels: { month: string; position: number }[] = []
        let currentMonth = -1
        let lastLabelPosition = -10 // Ensure first label always shows

        contributions.forEach((week, weekIndex) => {
            // Find a day with a valid date in this week
            const validDay = week.contributionDays.find(day => day.date !== '')
            if (validDay) {
                const date = new Date(`${validDay.date}T00:00:00Z`)
                const month = date.getUTCMonth()

                // Always add the first month, then check spacing for others
                if (currentMonth === -1) {
                    currentMonth = month
                    labels.push({ month: months[month], position: weekIndex })
                    lastLabelPosition = weekIndex
                } else if (month !== currentMonth && weekIndex - lastLabelPosition >= 4) {
                    currentMonth = month
                    labels.push({ month: months[month], position: weekIndex })
                    lastLabelPosition = weekIndex
                } else if (month !== currentMonth) {
                    currentMonth = month
                }
            }
        })

        return labels
    }

    const monthLabels = getMonthLabels()
    const totalWeeks = contributions.length

    const yearOptions = Array.from({ length: currentYear - 2015 }, (_, index) => currentYear - index)
    const headingText = selectedYear === null ? 'Last 12 Months' : `${selectedYear}`

    if (loading) {
        return (
            <div className="w-full">
                <div className="mb-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Featured</p>
                    <h3 className="text-xl font-semibold text-black dark:text-white mb-1">GitHub Activity</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{headingText}</p>
                    <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                    <div
                        className="grid gap-[2px]"
                        style={{ gridTemplateColumns: `repeat(${EXPECTED_WEEKS}, ${BLOCK_SIZE_PX}px)` }}
                    >
                        {Array.from({ length: 53 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[2px]">
                                {Array.from({ length: 7 }).map((_, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        className="h-[12px] w-[12px] rounded-[2px] bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full">
                <div className="mb-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Featured</p>
                    <h3 className="text-xl font-semibold text-black dark:text-white mb-1">GitHub Activity</h3>
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
                <h3 className="text-xl font-semibold text-black dark:text-white mb-1">GitHub Activity</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {headingText} • Total:{' '}
                        <span className="font-semibold text-black dark:text-white">{totalContributions.toLocaleString()}</span> contributions
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
                aria-label={`GitHub contribution graph showing ${totalContributions} contributions for ${headingText}`}
            >
                {/* Month labels - responsive positioning */}
                <div className="relative mb-2">
                    <div
                        className="grid text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400"
                        style={{ gridTemplateColumns: `repeat(${totalWeeks || EXPECTED_WEEKS}, ${BLOCK_SIZE_PX}px)` }}
                    >
                        {monthLabels.map((label, index) => (
                            <div
                                key={index}
                                className="text-left"
                                style={{ gridColumn: label.position + 1 }}
                            >
                                {label.month}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contribution grid - fits container width */}
                <div className="w-full overflow-x-auto">
                    <div
                        className="grid gap-[2px]"
                        style={{ gridTemplateColumns: `repeat(${totalWeeks || EXPECTED_WEEKS}, ${BLOCK_SIZE_PX}px)` }}
                    >
                        {contributions.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[2px]">
                                {week.contributionDays.map((day, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        className={`h-[12px] w-[12px] rounded-[2px] transition-colors ${getContributionColor(day.level)}`}
                                        title={day.date
                                            ? `${day.count} contributions on ${new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}`
                                            : 'No contributions'}
                                        aria-label={day.date ? `${day.count} contributions on ${day.date}` : 'No contributions'}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end mt-4 gap-2 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Less</span>
                    <div className="flex gap-[2px]">
                        {[0, 1, 2, 3, 4].map((level) => (
                            <div
                                key={level}
                                className={`w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] rounded-[2px] ${getContributionColor(level)}`}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    )
}
