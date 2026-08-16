import type { BlockImageNode, InlineImageNode } from '../../core'
import { ResourceImage } from '../../screen/resource-image'
import { projectResponsiveImageSources } from './manifest-projection'

export function ImageScreenRenderer({
  articleSlug,
  assetManifest,
  node,
  showDetails,
}: {
  readonly articleSlug: string
  readonly assetManifest: readonly unknown[]
  readonly node: InlineImageNode | BlockImageNode
  readonly showDetails: boolean
}) {
  const sources = projectResponsiveImageSources(
    node,
    articleSlug,
    assetManifest,
  )
  return (
    <ResourceImage
      key={sources.fallback}
      node={node}
      showDetails={showDetails}
      sources={sources}
    />
  )
}
