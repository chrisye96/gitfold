import type { RepoInfo } from '../shared/types'
import { parseGithubUrl } from '../shared/parse-url'
import { handleDownload } from './download'

const MENU_ID = 'gitfold-download'

export function registerContextMenu(): void {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Download with GitFold',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://github.com/*/tree/*',
      'https://github.com/*/*',
    ],
  })

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.url) return
    const repoInfo = parseGithubUrl(tab.url)
    if (!repoInfo) return
    handleDownload(tab.url, repoInfo).catch(console.error)
  })
}
