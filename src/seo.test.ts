import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8')
const html = read('index.html')
const doc = new DOMParser().parseFromString(html, 'text/html')
const meta = (sel: string) => doc.querySelector(sel)?.getAttribute('content') ?? ''

describe('SEO / GEO / page-speed audit (index.html)', () => {
  it('has a descriptive title and meta description', () => {
    expect(doc.title).toMatch(/FlowBoard/)
    expect(meta('meta[name="description"]').length).toBeGreaterThan(50)
    expect(meta('meta[name="description"]').length).toBeLessThanOrEqual(160)
  })

  it('declares language, viewport and theme-color', () => {
    expect(doc.documentElement.lang).toBe('en')
    expect(meta('meta[name="viewport"]')).toContain('width=device-width')
    expect(meta('meta[name="theme-color"]')).toMatch(/^#/)
  })

  it('has Open Graph and Twitter tags', () => {
    for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:site_name']) {
      expect(meta(`meta[property="${p}"]`), p).not.toBe('')
    }
    expect(meta('meta[name="twitter:card"]')).not.toBe('')
    expect(meta('meta[name="twitter:title"]')).not.toBe('')
  })

  it('canonical, og:url, robots.txt sitemap and sitemap loc all share one origin', () => {
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? ''
    const origin = new URL(canonical).origin
    expect(meta('meta[property="og:url"]')).toBe(canonical)
    expect(read('public/robots.txt')).toContain(`Sitemap: ${origin}/sitemap.xml`)
    expect(read('public/sitemap.xml')).toContain(`<loc>${origin}/</loc>`)
  })

  it('robots.txt allows crawling', () => {
    expect(read('public/robots.txt')).toMatch(/User-agent: \*\s+Allow: \//)
  })

  it('embeds valid SoftwareApplication JSON-LD', () => {
    const raw = doc.querySelector('script[type="application/ld+json"]')?.textContent ?? ''
    const data = JSON.parse(raw)
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('SoftwareApplication')
    expect(data.name).toBe('FlowBoard')
  })

  it('preconnects to Supabase and the font hosts', () => {
    const hrefs = [...doc.querySelectorAll('link[rel="preconnect"]')].map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://fonts.googleapis.com')
    expect(hrefs).toContain('https://fonts.gstatic.com')
    expect(hrefs.some((h) => h?.endsWith('.supabase.co'))).toBe(true)
  })

  it('loads fonts via <link>, not a render-blocking CSS @import', () => {
    expect(doc.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]')).not.toBeNull()
    expect(read('src/index.css')).not.toMatch(/@import/)
  })
})
