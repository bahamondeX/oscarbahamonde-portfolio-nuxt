export const fieldNames = ['name', 'email', 'phone', 'company', 'service', 'scope', 'budget', 'timeline', 'context']
/** @returns {Record<string, string>} */
export function cleanFields(input) {
 /** @type {Record<string, string>} */
 const out = {}
 for (const k of fieldNames) if (typeof input?.[k] === 'string') out[k] = input[k].replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, k === 'context' || k === 'scope' ? 2000 : 300)
 if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) delete out.email
 return out
}
export function safeFilename(name) { return String(name || 'attachment').split(/[\\/]/).pop().replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/^\.+/, '').slice(0,100) || 'attachment' }
export function cleanText(text, max = 4000) { return typeof text === 'string' ? text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max) : '' }
export function completeLead(fields) { return ['name','email','service','scope','budget','timeline'].every(k=>typeof fields[k] === 'string' && fields[k].length>0) }
export function validateArchiveEntry(name, originalSize, stats) {
 stats.count++;stats.total += originalSize
 if (stats.count > 100 || originalSize > 10_000_000 || stats.total > 25_000_000 || /(^|[\\/])\.\.([\\/]|$)|\u0000/.test(name) || /\.(exe|dll|com|bat|cmd|sh|js|vbs|ps1|scr|jar|msi|html?|svg)$/i.test(name) || /vbaProject\.bin$/i.test(name)) throw new Error('Unsafe archive')
 return true
}
