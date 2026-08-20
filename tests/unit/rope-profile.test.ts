import { describe, expect, it } from 'vitest'
import {
  isActiveHref,
  normalizePathname,
  resolveRopeProfile,
} from '../../src/features/navigation/rope-profile'

describe('rope profile', () => {
  it.each([
    ['/', 'hub'],
    ['/blog', 'hub'],
    ['/blog/', 'hub'],
    ['/notes/', 'hub'],
    ['/works/', 'hub'],
    ['/blog/p0-kitchen-sink', 'article'],
    ['/blog/p0-kitchen-sink/', 'article'],
  ] as const)('maps %s to %s', (pathname, profile) => {
    expect(resolveRopeProfile(pathname)).toBe(profile)
  })

  it('treats trailing slashes as the same path', () => {
    expect(normalizePathname('/blog/')).toBe('/blog')
    expect(normalizePathname('/')).toBe('/')
  })

  it('marks nested blog articles as the blog plate', () => {
    expect(isActiveHref('/blog/', '/blog/p0-kitchen-sink/')).toBe(true)
    expect(isActiveHref('/notes/', '/blog/')).toBe(false)
    expect(isActiveHref('/', '/blog/')).toBe(false)
  })
})
