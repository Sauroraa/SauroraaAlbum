import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.cwd())
const port = 8085

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function sendFile(response, filepath) {
  const ext = extname(filepath).toLowerCase()
  response.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
  createReadStream(filepath).pipe(response)
}

createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  const target = url.pathname === '/' ? '/preview/index.html' : url.pathname
  const filepath = normalize(join(root, target))

  if (!filepath.startsWith(root) || !existsSync(filepath) || statSync(filepath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  sendFile(response, filepath)
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview running on http://127.0.0.1:${port}`)
})

