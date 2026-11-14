import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from 'yaml'
import { readFileSync } from 'node:fs'
const t = parse(readFileSync(new URL('../template.yaml', import.meta.url), 'utf8')),
  r = t.Resources
test('lead stream has durable failures and TTL/KMS storage is enabled', () => {
  assert.equal(r.Leads.Properties.StreamSpecification.StreamViewType, 'NEW_AND_OLD_IMAGES')
  const stream = r.NotifyLead.Properties.Events.LeadStream.Properties
  assert.equal(stream.BisectBatchOnFunctionError, true)
  assert.equal(stream.DestinationConfig.OnFailure.Type, 'SQS')
  assert.deepEqual(stream.FunctionResponseTypes, ['ReportBatchItemFailures'])
  for (const table of ['Sessions', 'Messages', 'Leads']) {
    assert.equal(r[table].Properties.SSESpecification.SSEType, 'KMS')
    assert.equal(r[table].Properties.TimeToLiveSpecification.Enabled, true)
  }
  assert.equal(r.Chat.Properties.FunctionUrlConfig.InvokeMode, 'RESPONSE_STREAM')
  for (const tool of ['ServicesTool', 'AvailabilityTool', 'MeetingTool', 'EmailTool', 'LeadTool'])
    assert.equal(r[tool].Properties.FunctionUrlConfig, undefined)
  assert.equal(r.Chat.Properties.Environment.Variables.FREE_INTRO_CALL_ENABLED, 'false')
})

test('lead validation can query only the message table', () => {
  const statements = r.LeadTool.Properties.Policies.flatMap((p: any) => p.Statement || [])
  const query = statements.filter((s: any) => s.Action?.includes('dynamodb:Query'))
  assert.equal(query.length, 1)
  assert.deepEqual(query[0].Resource, { 'Fn::GetAtt': ['Messages', 'Arn'] })
})
