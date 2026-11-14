import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { storageReady } from './security'
let client: S3Client | undefined
function s3() {
 const c=useRuntimeConfig()
 if(!storageReady()) throw createError({statusCode:503,message:'Uploads unavailable'})
 return client ??= new S3Client({endpoint:c.storageEndpoint||undefined,region:c.storageRegion,forcePathStyle:!!c.storageEndpoint,credentials:{accessKeyId:c.storageAccessKeyId,secretAccessKey:c.storageSecretAccessKey}})
}
export async function putObject(key:string,data:Buffer,mime:string) { await s3().send(new PutObjectCommand({Bucket:useRuntimeConfig().storageBucket,Key:key,Body:data,ContentType:mime,ContentDisposition:'attachment',CacheControl:'private, no-store'})) }
export async function getObject(key:string) { const obj=await s3().send(new GetObjectCommand({Bucket:useRuntimeConfig().storageBucket,Key:key})); return Buffer.from(await obj.Body!.transformToByteArray()) }
export async function deleteObject(key:string) { await s3().send(new DeleteObjectCommand({Bucket:useRuntimeConfig().storageBucket,Key:key})) }
export async function signedDownload(key:string,name:string,seconds=900) { return getSignedUrl(s3(),new GetObjectCommand({Bucket:useRuntimeConfig().storageBucket,Key:key,ResponseContentDisposition:`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,ResponseCacheControl:'private, no-store'}),{expiresIn:seconds}) }
