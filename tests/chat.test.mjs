import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanFields, cleanText, safeFilename, validateArchiveEntry, completeLead } from '../shared/chat.mjs'
import { parseMedium } from '../shared/medium.mjs'
test('lead extraction only keeps bounded, allowed fields and valid email', () => {
  assert.deepEqual(cleanFields({name:' Ana\u0000 ',email:'not-email',admin:true,phone:'optional'}),{name:'Ana',phone:'optional'})
  assert.equal(cleanFields({scope:'x'.repeat(3000)}).scope.length,2000)
  assert.equal(cleanText('  Hello\u0000  '),'Hello')
  assert.equal(completeLead({name:'Ana',email:'ana@example.com'}),false)
})
test('attachment names and archive entries reject traversal, scripts and bombs', () => {
  assert.equal(safeFilename('../../private\\name.pdf'),'name.pdf')
  for(const [name,size] of [['../x',5],['script.js',5],['word/vbaProject.bin',5],['huge.txt',10000001]])assert.throws(()=>validateArchiveEntry(name,size,{count:0,total:0}))
  assert.throws(()=>validateArchiveEntry('a',1,{count:100,total:0}))
  assert.throws(()=>validateArchiveEntry('a',100,{count:0,total:25000000}))
  assert.ok(validateArchiveEntry('word/document.xml',100,{count:0,total:0}))
})
test('Medium rejects XML entities and external hosts, strips HTML and limits excerpts', () => {
  assert.throws(()=>parseMedium('<!DOCTYPE x [<!ENTITY a SYSTEM="file:///etc/passwd">]>'))
  const item=(url)=>`<rss><channel><item><title>Article</title><link>${url}</link><guid>abcdef123456</guid><pubDate>Mon, 04 Aug 2025 08:33:37 GMT</pubDate><description><![CDATA[<p>${'word '.repeat(100)}</p>]]></description></item></channel></rss>`
  assert.equal(parseMedium(item('https://evil.example/x')).length,0)
  const post=parseMedium(item('https://medium.com/@obahamonde/article-abcdef123456?source=rss'))[0]
  assert.equal(post.url,'https://medium.com/@obahamonde/article-abcdef123456')
  assert.ok(post.excerpt.split(' ').length<=55)
  assert.ok(!post.excerpt.includes('<p>'))
})
