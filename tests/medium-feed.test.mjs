import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMedium } from '../shared/medium.mjs'
const feed = (link, html, guid = 'https://medium.com/p/abcdef123456') => `<rss><channel><item><title>Technology &amp; AI</title><link>${link}</link><guid>${guid}</guid><pubDate>Wed, 10 Jun 2026 12:00:00 GMT</pubDate><category>ai</category><content:encoded><![CDATA[${html}]]></content:encoded></item></channel></rss>`
test('Medium publication posts use verified guid and skip tracking pixels for real covers', () => {
  const [post] = parseMedium(feed('https://python.plainenglish.io/article-abcdef123456?source=rss', '<img src="https://medium.com/_/stat" width="1" height="1"><p>Por Oscar Bahamonde</p><p>This is an article for our software readers.</p><img src="https://cdn-images-1.medium.com/max/800/example.png">'))
  assert.equal(post.image, 'https://cdn-images-1.medium.com/max/800/example.png')
  assert.equal(post.url, 'https://python.plainenglish.io/article-abcdef123456')
  assert.equal(post.mediumUrl, 'https://medium.com/p/abcdef123456')
  assert.deepEqual(post.tags, ['ai'])
  assert.equal(post.language, 'en')
  assert.equal(post.readingMinutes, 1)
  assert.doesNotMatch(post.excerpt, /Por Oscar/)
})
test('publication links cannot bypass host or guid validation', () => {
  assert.equal(parseMedium(feed('https://evil.example/article-abcdef123456', '<p>Text</p>')).length, 0)
  assert.equal(parseMedium(feed('https://ai.plainenglish.io/article-abcdef123456', '<p>Text</p>', 'https://evil.example/abcdef123456')).length, 0)
  assert.equal(parseMedium(feed('https://blog.gopenai.com/article-000000000000', '<p>Text</p>')).length, 0)
})
test('excerpts remove embeds and media links and never treat tracking pixels as covers', () => {
  const [post] = parseMedium(feed('https://medium.com/@obahamonde/article-abcdef123456', '<iframe src="https://medium.com/media/embed">embedded noise</iframe><p>https://medium.com/media/abc/href</p><p>El futuro de los datos para la nube.</p><img src="https://medium.com/_/stat" width="1" height="1">'))
  assert.equal(post.image, '')
  assert.equal(post.language, 'es')
  assert.doesNotMatch(post.excerpt, /medium.com|embedded noise/)
})
