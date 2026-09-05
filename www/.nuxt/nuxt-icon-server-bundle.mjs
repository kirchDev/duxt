import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
function createRemoteCollection(fetchEndpoint) {
  let _cache
  return async () => {
    if (_cache)
      return _cache
    const res = await fetch(fetchEndpoint).then(r => r.json())
    _cache = res
    return res
  }
}

export const collections = {
  'flag': () => require('@iconify-json/flag/icons.json'),
  'lucide': () => require('@iconify-json/lucide/icons.json'),
  'simple-icons': () => require('@iconify-json/simple-icons/icons.json'),
  'vscode-icons': () => require('@iconify-json/vscode-icons/icons.json'),
}