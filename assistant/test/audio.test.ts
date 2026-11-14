import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileTypeFromBuffer } from 'file-type'
import { recorderMime, normalizeAudioMime, audioFormat } from '../../shared/audio.js'

test('negotiates only advertised recording containers for Safari and Chromium', () => {
  assert.equal(recorderMime(type => type === 'audio/mp4'), 'audio/mp4')
  assert.equal(recorderMime(type => type === 'audio/webm;codecs=opus'), 'audio/webm;codecs=opus')
  assert.equal(recorderMime(() => false), undefined)
})

test('M4A file signature maps to the MP4 upload contract and Transcribe container', async () => {
  // Minimal ISO BMFF signature fixture, not a real microphone recording.
  const header = Buffer.alloc(32)
  header.writeUInt32BE(32, 0); header.write('ftypM4A ', 4); header.write('M4A isommp42', 16)
  const detected = await fileTypeFromBuffer(header)
  assert.equal(detected?.mime, 'audio/x-m4a')
  assert.equal(normalizeAudioMime(detected?.mime), 'audio/mp4')
  assert.equal(audioFormat(detected!.mime), 'mp4')
  assert.equal(audioFormat(detected!.mime, detected!.ext), 'm4a')
})

test('codec parameters normalize consistently without accepting arbitrary file formats', () => {
  assert.equal(normalizeAudioMime('audio/mp4;codecs=mp4a.40.2'), 'audio/mp4')
  assert.equal(audioFormat('audio/webm;codecs=opus'), 'webm')
  assert.equal(audioFormat('application/ogg'), 'ogg')
  assert.equal(audioFormat('application/pdf'), undefined)
  assert.equal(normalizeAudioMime('image/png'), 'image/png')
  assert.equal(audioFormat(''), undefined)
})
