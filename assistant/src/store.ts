import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { cfg, expires, ttlActive } from './config.js'
export const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})
export const hash = (s: string) => createHash('sha256').update(s).digest('hex')
export const get = async (table: string, id: string) =>
  (await db.send(new GetCommand({ TableName: table, Key: { id }, ConsistentRead: true }))).Item
export const put = async (table: string, item: any) =>
  db.send(new PutCommand({ TableName: table, Item: item }))
export async function update(table: string, id: string, fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([key]) => key !== 'id')
  if (!entries.length) return
  await db.send(
    new UpdateCommand({
      TableName: table,
      Key: { id },
      UpdateExpression: 'SET ' + entries.map((_, i) => `#k${i}=:v${i}`).join(','),
      ExpressionAttributeNames: Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])),
    }),
  )
}
export async function sessionCreate(locale: string) {
  const id = randomUUID(),
    secret = randomBytes(32).toString('hex')
  await put(cfg.table, {
    id,
    secretHash: hash(secret),
    locale,
    consentAt: null,
    turns: 0,
    tokens: 0,
    lastActivity: Date.now(),
    status: 'open',
    ttl: Math.floor(Date.now() / 1000) + 86400,
  })
  return { id, token: `${id}.${secret}` }
}
export async function consentSession(s: any, items: { role: string; content: string }[], client = db) {
  const at = new Date().toISOString(), ttl = expires()
  await client.send(new TransactWriteCommand({ TransactItems: [
    { Update: { TableName: cfg.table, Key: { id: s.id },
      UpdateExpression: 'SET consentAt=:at, #ttl=:ttl',
      ConditionExpression: 'attribute_not_exists(consentAt) OR consentAt=:none',
      ExpressionAttributeNames: { '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':at': at, ':ttl': ttl, ':none': null } } },
    ...items.map((m, index) => ({ Put: { TableName: cfg.messages, Item: {
      sessionId: s.id, sort: at + '#consent-' + String(index).padStart(2, '0'),
      role: m.role, content: m.content, ttl,
    } } })),
  ] }))
}
export async function authenticate(header: string) {
  const [id, secret] = header.replace(/^Bearer /, '').split('.')
  if (!id || !secret || secret.length !== 64) throw Error('unauthorized')
  const s = await get(cfg.table, id)
  if (
    !ttlActive(s) ||
    !s?.secretHash ||
    !timingSafeEqual(Buffer.from(hash(secret)), Buffer.from(s.secretHash))
  )
    throw Error('unauthorized')
  return s
}
export async function rate(key: string, limit: number) {
  const id = 'rate#' + key + '#' + Math.floor(Date.now() / 60000)
  try {
    await db.send(
      new UpdateCommand({
        TableName: cfg.table,
        Key: { id },
        UpdateExpression: 'SET #ttl=:ttl ADD #n :one',
        ConditionExpression: 'attribute_not_exists(#n) OR #n<:limit',
        ExpressionAttributeNames: { '#ttl': 'ttl', '#n': 'n' },
        ExpressionAttributeValues: {
          ':ttl': Math.floor(Date.now() / 1000) + 120,
          ':one': 1,
          ':limit': limit,
        },
      }),
    )
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') throw Error('rate_limit')
    throw e
  }
}
export async function lock(id: string) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: cfg.table,
        Key: { id },
        UpdateExpression: 'SET lockUntil=:until',
        ConditionExpression: 'attribute_not_exists(lockUntil) OR lockUntil<:now',
        ExpressionAttributeValues: { ':until': Date.now() + 120000, ':now': Date.now() },
      }),
    )
  } catch {
    throw Error('busy')
  }
}
export async function history(sessionId: string) {
  const r = await db.send(
    new QueryCommand({
      TableName: cfg.messages,
      KeyConditionExpression: 'sessionId=:s',
      ExpressionAttributeValues: { ':s': sessionId },
      ConsistentRead: true,
    }),
  )
  return (r.Items || []).filter(ttlActive)
}
export async function message(sessionId: string, role: string, content: string) {
  await put(cfg.messages, {
    sessionId,
    sort: new Date().toISOString() + '#' + randomUUID(),
    role,
    content,
    ttl: expires(),
  })
}
export async function reserveTurn(s: any) {
  await db.send(
    new UpdateCommand({
      TableName: cfg.table,
      Key: { id: s.id },
      UpdateExpression: 'ADD turns :one',
      ConditionExpression: '#status=:open AND turns<:max AND tokens<:budget',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':one': 1,
        ':open': 'open',
        ':max': cfg.maxTurns,
        ':budget': cfg.maxSessionTokens,
      },
    }),
  )
}
export async function lease(id: string) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: cfg.table,
        Key: { id },
        UpdateExpression: 'SET leaseUntil=:until, #ttl=:ttl',
        ConditionExpression:
          'attribute_not_exists(done) AND (attribute_not_exists(leaseUntil) OR leaseUntil<:now)',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':until': Date.now() + 180000,
          ':now': Date.now(),
          ':ttl': expires(),
        },
      }),
    )
    return true
  } catch (e: any) {
    if (e.name === 'ConditionalCheckFailedException') {
      if ((await get(cfg.table, id))?.done) return false
      throw Error('delivery_busy')
    }
    throw e
  }
}
export async function saveLead(s: any, data: any) {
  const old = await get(cfg.leads, s.id),
    item = {
      ...old,
      ...data,
      id: s.id,
      sessionId: s.id,
      origin: cfg.origin,
      status: data.status || old?.status || 'open',
      consentAt: s.consentAt,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: s.ttl,
    }
  if (old) await update(cfg.leads, s.id, item)
  else
    await db.send(
      new PutCommand({
        TableName: cfg.leads,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    )
  return { leadId: s.id, status: item.status }
}
export { TransactWriteCommand }
