import test from 'node:test'
import assert from 'node:assert/strict'
import { allFactRecords, retrieveFacts } from '../src/retrieval.js'
import services from '../../knowledge/services.json' with { type: 'json' }
import experience from '../../knowledge/experience.json' with { type: 'json' }
import certifications from '../../knowledge/certifications.json' with { type: 'json' }

test('indivisible source records preserve every service price/scope and employer/credential date', () => {
  for (const locale of ['es', 'en'] as const) {
    const records = allFactRecords(locale)
    assert.equal(new Set(records.map(r => r.id)).size, records.length)
    assert.ok(records.every(r => r.source && r.content && ['es', 'en'].includes(r.locale)))
    for (const s of services.services) {
      const record = records.find(r => r.id === `service:${s.id}`)!
      assert.equal(record.content.startingPricePEN, s.from)
      assert.equal(record.content.scope, s[locale].scope)
      assert.equal(record.content.conditions, services.conditions[locale])
    }
    for (const e of experience.entries) {
      const record = records.find(r => r.id === `employment:${e.id}`)!
      assert.deepEqual([record.content.company, record.content.role, record.content.start, record.content.end], [e.company, e.role[locale], e.start, e.end])
    }
    for (const c of certifications.entries) {
      const record = records.find(r => r.id === `certification:${c.id}`)!
      assert.deepEqual([record.content.name, record.content.issuer, record.content.issued, record.content.expires], [c.name, c.issuer, c.date, c.expires])
    }
  }
})

test('service synonyms and typographical errors retrieve the matching intact record in top three in both languages', () => {
  const cases = [
    ['landing', 'pagina de aterrizaje', 'landign page'],
    ['content', 'editar textos desde panel de administración', 'content management website'],
    ['commerce', 'tienda virtual', 'onlien store'],
    ['custom', 'plataforma SaaS', 'custom web application'],
    ['ai', 'asistente virtual', 'conversational agent'],
    ['integration', 'conectar sistemas', 'systmes integration'],
    ['cloud', 'migrar legacy a nube', 'cloud modernizaton'],
    ['data', 'auditoría de datos', 'data quality audit'],
    ['infra', 'optimizar infraestructura', 'infrastrcture review'],
  ]
  for (const [id, es, en] of cases) {
    for (const [locale, query] of [['es', es], ['en', en]] as const) {
      const found = retrieveFacts(query!, locale as 'es' | 'en', 3)
      assert.ok(found.some(r => r.id === `service:${id}`), `${locale}: ${query} -> ${found.map(r => r.id)}`)
    }
  }
})

test('entity/date and credential queries preserve source provenance and scope rather than substitute a similar record', () => {
  for (const locale of ['es', 'en'] as const) {
    assert.equal(retrieveFacts('Dynata', locale, 1)[0]?.id, 'employment:dynata')
    const certs = retrieveFacts('certification AZ-900 Azure Fundamentals', locale, 3)
    assert.ok(certs.some(r => r.content.name === 'AZ-900 Azure Fundamentals'))
    const booking = retrieveFacts('horario disponible para agendar una reunión y pago', locale, 3)
    assert.ok(booking.some(r => r.id === 'faq:0'))
    assert.deepEqual(retrieveFacts('zzxyqplmn', locale), [])
    assert.deepEqual(retrieveFacts('cloud', locale, 0), [])
    assert.equal(retrieveFacts('Dynata', locale, 1).length, 1)
  }
})

test('explicit commercial intent cannot rank an ITIL service-management credential above services', () => {
  for (const locale of ['es', 'en'] as const) {
    const found = retrieveFacts(locale === 'es' ? 'Todos los servicios y precios' : 'Show all service prices', locale, 9)
    assert.equal(found.length, 9)
    assert.ok(found.every(r => r.type === 'service'))
  }
})
