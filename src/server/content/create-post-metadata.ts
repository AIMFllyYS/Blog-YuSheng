import 'server-only'

import type { Metadata } from 'next'
import { isAuthorHostedImageUrl } from '../../features/doc-engine/security/embed-iframe-policy'
import { readPost } from './read-post'

export async function createPostMetadata(
  slug: string,
  siteOrigin = process.env.SITE_ORIGIN,
): Promise<Metadata> {
  const { frontmatter } = await readPost(slug)
  const cover = resolveSocialCover(frontmatter.cover, slug, siteOrigin)

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      images: cover ? [cover] : undefined,
    },
  }
}

function resolveSocialCover(
  cover: string | undefined,
  slug: string,
  siteOrigin: string | undefined,
) {
  if (!cover) return undefined
  if (isAuthorHostedImageUrl(cover)) return cover
  if (!siteOrigin) return undefined
  return createSocialCoverUrl(siteOrigin, slug, cover)
}

function createSocialCoverUrl(
  siteOrigin: string,
  slug: string,
  relativePath: string,
) {
  const origin = new URL(siteOrigin)
  if (
    origin.protocol !== 'https:' ||
    origin.username.length > 0 ||
    origin.password.length > 0 ||
    origin.pathname !== '/' ||
    origin.search.length > 0 ||
    origin.hash.length > 0 ||
    isLoopbackHostname(origin.hostname)
  ) {
    throw new Error('SITE_ORIGIN 必须是公开且仅含 origin 的 HTTPS URL')
  }

  const cleanPath = relativePath.replace(/^\.\//, '')
  const encodedPath = cleanPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return new URL(`/blog/${slug}/${encodedPath}`, origin).toString()
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.+$/, '')
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    /^\[::ffff:7f[\da-f]{2}:/.test(normalized) ||
    /^127(?:\.|$)/.test(normalized)
  )
}
