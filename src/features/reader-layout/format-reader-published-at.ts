const SHANGHAI = 'Asia/Shanghai'

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  month: 'long',
  timeZone: SHANGHAI,
  year: 'numeric',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: 'long',
  timeZone: SHANGHAI,
  year: 'numeric',
})

function shanghaiClockParts(iso: string): {
  readonly hour: number
  readonly minute: number
  readonly second: number
} {
  const date = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: SHANGHAI,
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value
    return value ? Number.parseInt(value, 10) : 0
  }
  return {
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

/** True when Asia/Shanghai local time is not 00:00:00. */
export function publishedAtHasClockTime(iso: string): boolean {
  const clock = shanghaiClockParts(iso)
  return clock.hour !== 0 || clock.minute !== 0 || clock.second !== 0
}

/**
 * Reading-column header date. Calendar day always; clock time only when
 * `publishedAt` is not Shanghai midnight. Never returns a raw ISO string.
 */
export function formatReaderPublishedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid publishedAt: ${iso}`)
  }
  return publishedAtHasClockTime(iso)
    ? DATETIME_FORMATTER.format(date)
    : DATE_FORMATTER.format(date)
}
