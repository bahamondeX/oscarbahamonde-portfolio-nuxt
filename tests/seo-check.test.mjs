import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHtml, validate } from '../scripts/seo-check.mjs'

test('SEO metadata parser respects attribute order/entities and nested JSON-LD types',()=>{
 const html=`<html lang='es-PE'><head><meta content="Oscar &amp; IA" property="og:title"><link href='https://example.test/es' rel='canonical'><script type="application/ld+json">{"@graph":[{"@type":"Person"},{"@type":"Service","offers":{"@type":"Offer"}}]}</script></head><body><section data-section="home"><article class="featured blog-card"></article></section></body></html>`
 const page=parseHtml(html)
 assert.equal(page.openGraph['og:title'],'Oscar & IA')
 assert.deepEqual(page.canonical,['https://example.test/es'])
 assert.deepEqual(page.schemaTypes,{Person:1,Service:1,Offer:1})
 assert.equal(page.ssrBlogCards,1);assert.equal(page.sections,1);assert.equal(page.jsonLdValid,true)
 assert.equal(parseHtml('<script type="application/ld+json">broken</script>').jsonLdValid,false)
})
test('missing HTTP bodies cannot vacuously pass SEO JSON-LD, sitemap, blog or llms checks',()=>{
 const report=validate([],'https://oscarbahamonde.com')
 assert.equal(report.checks.length,54)
 for(const name of ['es JSON-LD','sitemap post lastmod','sitemap post language alternatives','sitemap single owned host','blog metadata','llms local20+Medium10+originals'])assert.equal(report.checks.find(x=>x.name===name).passed,false,name)
 assert.equal(report.summary.passed,0)
})
