import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe'
import { fileTypeFromBuffer } from 'file-type'
import { cfg, ttlActive, metric } from './config.js'
import { get, update, message } from './store.js'
const s3 = new S3Client({}),
  transcribe = new TranscribeClient({})
export async function validateObject(file: any) {
  if (!file.key.startsWith(file.sessionId + '/')) throw Error('ownership')
  const head = await s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: file.key }))
  if (
    head.ContentLength !== file.size ||
    file.size > cfg.maxBytes ||
    head.ContentType !== file.mime
  )
    throw Error('invalid_file_size_or_type')
  const obj = await s3.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: file.key, Range: 'bytes=0-8191' }),
    ),
    bytes = await obj.Body!.transformToByteArray()
  const found = await fileTypeFromBuffer(bytes)
  const mime =
    found?.mime === 'video/webm'
      ? 'audio/webm'
      : found?.mime === 'video/mp4'
        ? 'audio/mp4'
        : found?.mime === 'application/ogg'
          ? 'audio/ogg'
          : found?.mime
  if (mime !== file.mime) throw Error('mime_mismatch')
}
export async function handler(event: { sessionId: string; fileId: string }) {
  const s = await get(cfg.table, event.sessionId)
  if (!ttlActive(s)) return
  const file = (s!.files || []).find((x: any) => x.id === event.fileId)
  if (!file || file.processed) return
  try {
    await validateObject({ ...file, sessionId: s!.id })
    if (file.kind === 'audio') {
      const job = 'oscar-' + event.fileId,
        output = s!.id + '/' + file.id + '.transcript.json'
      try {
        await transcribe.send(
          new StartTranscriptionJobCommand({
            TranscriptionJobName: job,
            IdentifyLanguage: true,
            LanguageOptions: ['es-US', 'en-US'],
            Media: { MediaFileUri: `s3://${cfg.bucket}/${file.key}` },
            OutputBucketName: cfg.bucket,
            OutputKey: output,
            OutputEncryptionKMSKeyId: cfg.key,
          }),
        )
      } catch (e: any) {
        if (e.name !== 'ConflictException') throw e
      }
      let completed = false
      for (let i = 0; i < 45; i++) {
        const r = await transcribe.send(
          new GetTranscriptionJobCommand({ TranscriptionJobName: job }),
        )
        if (r.TranscriptionJob?.TranscriptionJobStatus === 'FAILED')
          throw Error('transcription_failed')
        if (r.TranscriptionJob?.TranscriptionJobStatus === 'COMPLETED') {
          completed = true
          break
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
      if (!completed) throw Error('transcription_timeout')
      const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: output })),
        data = JSON.parse(await obj.Body!.transformToString())
      const text = String(data.results?.transcripts?.[0]?.transcript || '').slice(0, 12000)
      if (!text) throw Error('empty_transcription')
      await message(s!.id, 'user', '[Audio transcription — untrusted visitor data]\n' + text)
      file.transcriptKey = output
      file.transcription = text
    }
    file.processed = true
    file.validated = true
    const latest = await get(cfg.table, s!.id)
    if (!ttlActive(latest)) return
    await update(cfg.table, s!.id, {
      files: (latest!.files || []).map((f: any) => (f.id === file.id ? file : f)),
    })
  } catch {
    metric('MediaErrors')
    throw Error('media_processing_failed')
  }
}
