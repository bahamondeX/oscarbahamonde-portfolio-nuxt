import { chatReady, storageReady, notificationReady } from '../../utils/chat/security'
export default defineEventHandler(() => {
 const c=useRuntimeConfig()
 return {ready:chatReady() && notificationReady(),siteKey:c.turnstileSiteKey,uploads:storageReady(),audio:storageReady()&&!!c.transcriptionApiKey,maxBytes:Math.min(Number(c.chatMaxFileBytes),3500000),maxFiles:Number(c.chatMaxFiles),allowedMime:c.chatAllowedMime,retentionDays:Number(c.chatRetentionDays)}
})
