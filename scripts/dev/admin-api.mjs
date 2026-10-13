import { createServer } from 'node:http'
import { rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { handleAdminRequest } from '../../functions/lib/handle-admin.mjs'
import { loadAdminCatalog } from '../lib/admin-catalog.mjs'
import { serializeVisibility } from '../../src/server/visibility/visibility-json.mjs'

const host = '127.0.0.1'
const port = 9983
const allowOrigins = ['http://127.0.0.1:9981', 'http://localhost:9981']
const visibilityFile = path.join(process.cwd(), 'content', 'visibility.json')

/**
 * @param {{ posts: string[], briefs: string[] }} list
 */
async function writeVisibility(list) {
  const temporary = `${visibilityFile}.${process.pid}.tmp`
  await writeFile(temporary, serializeVisibility(list), 'utf8')
  await rename(temporary, visibilityFile)
}

const server = createServer((nodeRequest, nodeResponse) => {
  void serve(nodeRequest, nodeResponse)
})

server.on('error', (error) => {
  console.error(`[admin] failed to listen on ${host}:${port}`)
  console.error(error)
  process.exit(1)
})

server.listen(port, host, () => {
  console.log(`[admin] http://${host}:${port}`)
})

/**
 * @param {import('node:http').IncomingMessage} nodeRequest
 * @param {import('node:http').ServerResponse} nodeResponse
 */
async function serve(nodeRequest, nodeResponse) {
  try {
    const request = await toRequest(nodeRequest)
    const catalog = await loadAdminCatalog()
    const response = await handleAdminRequest({
      request,
      env: process.env,
      catalog,
      canWrite: true,
      allowOrigins,
      reloadCatalog: loadAdminCatalog,
      writeVisibility,
    })
    await writeResponse(nodeResponse, response)
  } catch (error) {
    console.error('[admin] request failed')
    console.error(error)
    nodeResponse.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    nodeResponse.end(JSON.stringify({ error: '后台接口暂时不可用' }))
  }
}

/**
 * @param {import('node:http').IncomingMessage} nodeRequest
 */
async function toRequest(nodeRequest) {
  const chunks = []
  for await (const chunk of nodeRequest) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks)
  const headers = new Headers()
  for (const [key, value] of Object.entries(nodeRequest.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  const method = nodeRequest.method ?? 'GET'
  return new Request(`http://${host}:${port}${nodeRequest.url ?? '/'}`, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  })
}

/**
 * @param {import('node:http').ServerResponse} nodeResponse
 * @param {Response} response
 */
async function writeResponse(nodeResponse, response) {
  const headers = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  nodeResponse.writeHead(response.status, headers)
  nodeResponse.end(Buffer.from(await response.arrayBuffer()))
}
