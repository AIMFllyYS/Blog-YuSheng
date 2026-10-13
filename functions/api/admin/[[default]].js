import { catalog } from '../../generated/catalog.mjs'
import { handleAdminRequest } from '../../lib/handle-admin.mjs'

export async function onRequest(context) {
  return handleAdminRequest({
    request: context.request,
    env: context.env ?? {},
    catalog,
    canWrite: false,
  })
}
