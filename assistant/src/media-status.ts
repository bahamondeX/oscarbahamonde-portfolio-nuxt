export const mediaTerminal = (file: any) => file.processed || ['failed', 'abandoned'].includes(file.status)
export function mediaWaitState(files: any[], attempts: number, now = Date.now()) {
  const pending = files.filter(f => !mediaTerminal(f))
  // At most three event retries for media; notify still delivers known valid originals on fallback.
  const wait = pending.length > 0 && attempts < 3 && pending.some(f => now - Number(f.createdAt || 0) < 5 * 60000)
  return { wait, pending }
}
export function fileDeliveryNotes(files: any[]) {
  return files.filter(f => ['failed', 'abandoned'].includes(f.status) || !f.processed).map(f => ({
    name: String(f.name || 'Archivo'),
    reason: f.validated
      ? 'Original validado adjunto o enlazado. No se completó la transcripción/procesamiento; revisar el original.'
      : 'Carga no completada o archivo no validado. No se adjunta contenido sin validar.',
  }))
}
