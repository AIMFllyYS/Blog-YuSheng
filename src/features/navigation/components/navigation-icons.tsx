type IconProps = {
  className?: string
}

const iconClassName = 'size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round]'

export function ThemeIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${iconClassName} ${className}`}
      viewBox="0 0 24 24"
    >
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.64 5.64l1.77 1.77M16.59 16.59l1.77 1.77M18.36 5.64l-1.77 1.77M7.41 16.59l-1.77 1.77" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

export function AudioIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${iconClassName} ${className}`}
      viewBox="0 0 24 24"
    >
      <path d="M5 9v6h4l5 4V5L9 9H5Z" />
      <path d="M17 9.25a4 4 0 0 1 0 5.5M19.5 7a7 7 0 0 1 0 10" />
    </svg>
  )
}

export function SettingsIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${iconClassName} ${className}`}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.17l2-1.56-2-3.46-2.48 1A7.2 7.2 0 0 0 14.4 5.6L14 3h-4l-.4 2.6a7.2 7.2 0 0 0-2.02 1.21l-2.48-1-2 3.46 2 1.56A7 7 0 0 0 5 12c0 .4.03.79.1 1.17l-2 1.56 2 3.46 2.48-1A7.2 7.2 0 0 0 9.6 18.4L10 21h4l.4-2.6a7.2 7.2 0 0 0 2.02-1.21l2.48 1 2-3.46-2-1.56c.07-.38.1-.77.1-1.17Z" />
    </svg>
  )
}

export function CloseIcon({ className = '' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${iconClassName} ${className}`}
      viewBox="0 0 24 24"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function ShareIcon({ className = '' }: IconProps) {
  return (
    <svg aria-hidden="true" className={`${iconClassName} ${className}`} viewBox="0 0 24 24">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4" />
    </svg>
  )
}

export function GithubIcon({ className = '' }: IconProps) {
  return (
    <svg aria-hidden="true" className={`size-5 fill-current stroke-none ${className}`} viewBox="0 0 24 24">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.5v-1.7c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.38-5.26 5.67.42.36.79 1.07.79 2.16v3.2c0 .25.21.62.8.51A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}
