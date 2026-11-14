export const recorderTypes = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus'] as const

export function recorderMime(supported: (mime: string) => boolean): string | undefined {
  return recorderTypes.find(type => supported(type))
}

export function normalizeAudioMime(type = ''): string {
  const mime = type.toLowerCase().split(';')[0]!.trim()
  if (['audio/x-m4a', 'audio/m4a', 'video/mp4'].includes(mime)) return 'audio/mp4'
  if (mime === 'video/webm') return 'audio/webm'
  if (mime === 'application/ogg') return 'audio/ogg'
  return mime
}

export function audioFormat(mime: string, detectedExtension?: string): 'mp4' | 'm4a' | 'webm' | 'ogg' | undefined {
  if (normalizeAudioMime(mime) === 'audio/mp4' && detectedExtension === 'm4a') return 'm4a'
  return ({ 'audio/mp4': 'mp4', 'audio/webm': 'webm', 'audio/ogg': 'ogg' } as const)[normalizeAudioMime(mime) as 'audio/mp4' | 'audio/webm' | 'audio/ogg']
}
