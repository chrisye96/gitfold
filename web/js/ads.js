/**
 * GitSnip — Ad Slot Manager
 *
 * To switch ad providers, change PROVIDER below and fill in CONFIG.
 * To disable ads entirely, set PROVIDER = 'none'.
 *
 * Supported providers:
 *   'carbon'     — Carbon Ads (developer-focused, recommended)
 *   'adsense'    — Google AdSense
 *   'ethicalads' — EthicalAds (privacy-first, developer-focused)
 *   'none'       — No ads
 *
 * Slot names used in HTML: 'footer' | 'result'
 *
 * @module ads
 */

// ─── Change this one line to switch providers ─────────────────────────────────
// Options: 'carbon' | 'adsense' | 'ethicalads' | 'none'
const PROVIDER = 'none'

// ─── Per-slot on/off switches ─────────────────────────────────────────────────
// Phase 1: footer only. Enable 'result' in Phase 2 once traffic is stable.
const SLOTS = {
  footer: true,
  result: false,   // reserved — enable in Phase 2
}

// ─── Fill in credentials for your active provider ────────────────────────────
const CONFIG = {
  carbon: {
    // From your Carbon Ads dashboard → Placements
    serve:     'YOUR_SERVE_ID',      // e.g. 'CKYIL2JW'
    placement: 'gitsnipcc',          // your site slug
  },

  adsense: {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',
    slots: {
      footer: 'XXXXXXXXXX',
      result: 'XXXXXXXXXX',
    },
  },

  ethicalads: {
    publisher: 'YOUR_PUBLISHER_ID',  // e.g. 'gitsnip'
    type:      'text',               // 'text' | 'image' | 'text-image'
  },
}

// ─── Internal: load a script once ────────────────────────────────────────────

const _loadedScripts = new Set()

function loadScript(src, attrs = {}) {
  if (_loadedScripts.has(src)) return
  _loadedScripts.add(src)
  const s = document.createElement('script')
  s.src = src
  s.async = true
  Object.assign(s, attrs)
  document.head.appendChild(s)
}

// ─── Provider renderers ───────────────────────────────────────────────────────

const providers = {

  // Carbon Ads — one script per page, renders into the container
  carbon: {
    render(container, _slot) {
      const { serve, placement } = CONFIG.carbon
      const s = document.createElement('script')
      s.id = '_carbonads_js'
      s.async = true
      s.src = `//cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}`
      container.appendChild(s)
    },
  },

  // Google AdSense — one global script, one <ins> per slot
  adsense: {
    render(container, slot) {
      const { client, slots } = CONFIG.adsense
      loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        dataset: { adClient: client },
      })
      const ins = document.createElement('ins')
      ins.className = 'adsbygoogle'
      ins.style.display = 'block'
      ins.dataset.adClient = client
      ins.dataset.adSlot = slots[slot]
      ins.dataset.adFormat = 'auto'
      ins.dataset.fullWidthResponsive = 'true'
      container.appendChild(ins)
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    },
  },

  // EthicalAds — one global script, data attributes on the container
  ethicalads: {
    render(container, _slot) {
      const { publisher, type } = CONFIG.ethicalads
      container.dataset.eaPublisher = publisher
      container.dataset.eaType = type
      loadScript('https://media.ethicalads.io/media/client/ethicalads.min.js')
    },
  },

  // No-op
  none: {
    render() {},
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mount an ad into a container element.
 * The container should have data-ad-slot="footer" or data-ad-slot="result".
 * Does nothing if PROVIDER is 'none' or the container is null.
 *
 * @param {HTMLElement | null} container
 */
export function mountAd(container) {
  if (!container || PROVIDER === 'none') return
  const slot = container.dataset.adSlot || 'footer'
  if (!SLOTS[slot]) return          // slot disabled — reserved for future phase
  const provider = providers[PROVIDER]
  if (!provider) return
  container.hidden = false
  provider.render(container, slot)
}

/**
 * Mount all ad slots on the page.
 * Call once after the DOM is ready.
 */
export function mountAllAds() {
  document.querySelectorAll('.ad-slot').forEach(mountAd)
}
