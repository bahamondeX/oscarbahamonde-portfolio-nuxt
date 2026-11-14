import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { db, saveLead, update, get } from './store.js'
import { cfg, ttlActive } from './config.js'
export async function handler() {
  let cursor: any
  do {
    const page = await db.send(
      new ScanCommand({
        TableName: cfg.leads,
        ExclusiveStartKey: cursor,
        FilterExpression: '#status=:open',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':open': 'open' },
      }),
    )
    cursor = page.LastEvaluatedKey
    for (const lead of page.Items || [])
      if (ttlActive(lead) && Date.parse(lead.updatedAt) < Date.now() - 15 * 60000) {
        const session = await get(cfg.table, lead.sessionId)
        if (session?.lastActivity > Date.now() - 15 * 60000 || session?.lockUntil > Date.now())
          continue
        await saveLead(
          { id: lead.id, ttl: lead.ttl, consentAt: lead.consentAt },
          { status: 'closed' },
        )
        await update(cfg.table, lead.sessionId, { status: 'closed' })
      }
  } while (cursor)
}
