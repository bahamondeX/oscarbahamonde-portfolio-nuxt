import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectKnowledge, knowledgeContexts, servicePriceMapping } from '../src/knowledge.js'
import { groundingRules, systemBlocks } from '../src/agent.js'
import source from '../../knowledge/experience.json' with { type: 'json' }
import catalog from '../../knowledge/services.json' with { type: 'json' }

test('conversational knowledge keeps source facts and only the requested language without UI/RSS payloads', () => {
  for (const locale of ['es', 'en'] as const) {
    const data = projectKnowledge(locale)
    assert.equal(data.experience.length, source.entries.length)
    for (const [index, entry] of data.experience.entries()) {
      assert.equal(entry.description, source.entries[index]!.description[locale])
      assert.equal(entry.role, source.entries[index]!.role[locale])
    }
    assert.equal(typeof data.profile.bio, 'string')
    assert.ok(data.posts.every(p => Object.keys(p).sort().join() === 'language,title,url'))
    assert.doesNotMatch(knowledgeContexts[locale], /"logoTone"|"imageAlt"|"excerpt"/)
    assert.ok(Buffer.byteLength(knowledgeContexts[locale]) < 25000)
  }
})

test('closed employment cannot become current during context projection and all service floors remain exact', () => {
  const data = projectKnowledge('en')
  const dynata = data.experience.find(e => e.company === 'Dynata')!
  assert.equal(dynata.end, '2026-03')
  assert.equal(dynata.employmentStatus, 'ended')
  assert.equal(data.profile.currentEmployer, null)
  assert.equal(data.services.length, 9)
  for (const service of catalog.services) {
    assert.equal(data.services.find(s => s.id === service.id)!.startingPricePEN, service.from)
    assert.ok(servicePriceMapping.en.includes('S/' + service.from))
  }
  assert.match(servicePriceMapping.en, /Platform\/SaaS MVP S\/4500/)
  assert.match(servicePriceMapping.en, /Systems integration S\/3500/)
})

test('identity, job dates and commercial grounding follow the knowledge and stay in the last uncached block', () => {
  for (const locale of ['es', 'en'] as const) {
    const blocks = systemBlocks(locale, false)
    assert.ok(blocks[0].text.endsWith(groundingRules(locale)))
    assert.ok(blocks.at(-1).text.includes(groundingRules(locale)))
    assert.equal(systemBlocks(locale, true)[0].text, blocks[0].text)
  }
  assert.notEqual(systemBlocks('es', false)[0].text, systemBlocks('en', false)[0].text)
  assert.match(systemBlocks('en', false).at(-1).text, /do not append a commercial\/pricing section or Oscar career stories\/metrics unless the visitor asks/)
  assert.match(systemBlocks('en', false).at(-1).text, /retrieval efficiency is not lookup latency/)
})
