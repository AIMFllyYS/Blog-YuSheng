import { catalog } from '../../generated/catalog.mjs'
import {
  applyVisibilityToCatalog,
  fetchGithubVisibility,
  readGithubConfig,
  writeGithubVisibility,
} from '../../lib/github-visibility.mjs'
import { handleAdminRequest } from '../../lib/handle-admin.mjs'

export async function onRequest(context) {
  const processEnv =
    typeof process !== 'undefined' && process.env ? process.env : {}
  const env = { ...processEnv, ...(context.env ?? {}) }
  const github = readGithubConfig(env)

  /** @type {{ posts: string[], briefs: string[] } | undefined} */
  let writtenVisibility

  return handleAdminRequest({
    request: context.request,
    env,
    catalog,
    canWrite: Boolean(github),
    reloadCatalog: github
      ? async () => {
          if (writtenVisibility) {
            return applyVisibilityToCatalog(catalog, writtenVisibility)
          }
          try {
            const { visibility } = await fetchGithubVisibility(github)
            return applyVisibilityToCatalog(catalog, visibility)
          } catch {
            return catalog
          }
        }
      : undefined,
    writeVisibility: github
      ? async (list) => {
          await writeGithubVisibility(github, list)
          writtenVisibility = list
        }
      : undefined,
  })
}
