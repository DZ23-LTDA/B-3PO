import { chromium } from 'playwright-core'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9226')
const page = browser.contexts().flatMap(c => c.pages())[0]
await page.waitForTimeout(4000)
const res = await page.evaluate(() => {
  const text = document.body.innerText
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const imgs = Array.from(document.querySelectorAll('img')).map(i => i.currentSrc || i.src).filter(Boolean)
  return {
    htmlLang: document.documentElement.lang,
    temHermes: /Hermes Agent|HERMES AGENT|Share with Nous/.test(text),
    hermes: lines.filter(l => /Hermes/i.test(l)).slice(0, 5),
    b3po: lines.filter(l => /B-3PO/.test(l)).slice(0, 5),
    mascotes: imgs.filter(s => /mascots\//.test(s)).length,
    imgs: imgs.slice(0, 3).map(s => s.split('/').pop()),
    primeiras: lines.slice(0, 12)
  }
})
console.log(JSON.stringify(res, null, 2))
await page.screenshot({ path: process.env.SHOT_OUT })
await browser.close()
