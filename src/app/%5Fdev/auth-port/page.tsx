import { notFound } from 'next/navigation'

import { AuthPortSwitch } from './auth-port-switch'

export default function AuthPortDevelopmentPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <AuthPortSwitch />
}
