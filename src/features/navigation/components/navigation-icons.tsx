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
