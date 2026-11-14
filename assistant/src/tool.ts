import { cfg, ttlActive } from './config.js'
import { get } from './store.js'
import { schemas, type ToolName } from './validation.js'
import { executeTool } from './tools.js'
// No Function URL: this Lambda is callable only by the orchestrator's scoped IAM role.
export async function handler(event: any) {
  const name = process.env.TOOL_NAME as ToolName
  if (!schemas[name] || typeof event.sessionId !== 'string') throw Error('invalid_tool_invocation')
  const s = await get(cfg.table, event.sessionId)
  if (!s || !ttlActive(s)) throw Error('invalid_session')
  if (!['get_services', 'check_availability'].includes(name) && !s?.consentAt) throw Error('consent_required')
  if (
    ['send_email', 'schedule_meeting'].includes(name) &&
    !(name === 'schedule_meeting' && !cfg.freeIntro)
  ) {
    const p = s.pending
    if (
      !p ||
      p.id !== event.confirmationId ||
      p.name !== name ||
      p.expires < Date.now() ||
      !p.approved ||
      JSON.stringify(p.args) !== JSON.stringify(event.input)
    )
      throw Error('explicit_confirmation_required')
  }
  return executeTool(name, event.input, s, event.confirmationId)
}
