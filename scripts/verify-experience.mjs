import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const sourcePath = 'docs/linkedin-full-experience.txt'
const source = await readFile(sourcePath, 'utf8')
const entries = JSON.parse(await readFile('data/experience.json', 'utf8'))
const months = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sept: '09', oct: '10', nov: '11', dic: '12' }
const sourceUrl = 'https://linkedin.com/in/obahamondem/details/experience/'
const roles = entries.map(entry => {
  const start = source.indexOf('\n' + entry.role.en + '\n')
  const block = source.slice(start + 1, start + 500)
  const match = block.match(/(ene|feb|mar|abr|may|jun|jul|ago|sept|oct|nov|dic)\. de (\d{4}) - (ene|feb|mar|abr|may|jun|jul|ago|sept|oct|nov|dic)\. de (\d{4})/)
  const observedStart = match ? `${match[2]}-${months[match[1]]}` : null
  const observedEnd = match ? `${match[4]}-${months[match[3]]}` : null
  const companyMatch = start >= 0 && block.includes(entry.company)
  return {
    id: entry.id, company: entry.company, role: entry.role.en,
    start: entry.start, end: entry.end, current: entry.current,
    source: sourceUrl, sourceFile: sourcePath,
    sourceLine: start >= 0 ? source.slice(0, start + 1).split('\n').length : null,
    sourceExcerpt: match ? block.slice(0, match.index + match[0].length) : null,
    observedStart, observedEnd, companyMatch,
    datesMatch: !!match && entry.start === observedStart && entry.end === observedEnd && entry.current === false,
    verification: match && companyMatch ? 'owner-public-linkedin' : 'not-verified',
    independentlyCorroboratedDates: false,
  }
})
const report = {
  checkedAt: new Date().toISOString(),
  method: 'Compare all 16 JSON records with the archived text captured from the owner’s public LinkedIn experience page during the 2026-11-14 audit. This is a reproducible comparison with that snapshot, not a new authenticated browser visit or independent employer verification.',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  dataSha256: createHash('sha256').update(await readFile('data/experience.json')).digest('hex'),
  total: roles.length, matchingDates: roles.filter(r => r.datesMatch && r.companyMatch).length,
  roles,
  independentPublicSearch: {
    checkedOn: '2026-11-14',
    queries: ['"Oscar Bahamonde" Dynata Globant "2025"', '"Oscar Bahamonde" Huawei Telefónica experience', '"Oscar Martin Bahamonde Muñoz" "Dynata"', '"Oscar Martin Bahamonde Muñoz" "Huawei"'],
    result: 'No independent source retrieved establishes the start/end dates of these roles. A company LinkedIn page lists Oscar among In Plain English employees, which supports association only, not dates or current employment.',
    associationSource: 'https://www.linkedin.com/company/inplainenglish/',
    excludedEvidence: 'Other people with similar names, generic biographies, company logos and a speaker profile do not establish employment dates.',
  },
  unknownFields: [
    { id: 'freelance', field: 'description', reason: 'No description in the archived profile; ES and EN remain null.', questionForOwner: '¿Qué alcance y proyectos puedes documentar de tu etapa freelance de julio2022 a enero2023?' },
    { id: 'indra', field: 'location', reason: 'No location in the archived profile; remains null.', questionForOwner: '¿Cuál era tu ubicación/modalidad durante Indra, abril a diciembre2021?' },
    { id: null, field: 'currentEmployer', reason: 'All listed roles have an end date. No current employer is documented; this does not imply unemployment.' },
  ],
}
await writeFile('docs/experience-verification.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ total: report.total, matchingDates: report.matchingDates, independentDateVerification: 0 }))
if (report.matchingDates !== report.total) process.exitCode = 1
