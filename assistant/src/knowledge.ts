import services from '../../knowledge/services.json' with { type: 'json' }
import profile from '../../knowledge/profile.json' with { type: 'json' }
import experience from '../../knowledge/experience.json' with { type: 'json' }
import skills from '../../knowledge/skills.json' with { type: 'json' }
import projects from '../../knowledge/projects.json' with { type: 'json' }
import certifications from '../../knowledge/certifications.json' with { type: 'json' }
import posts from '../../knowledge/posts.json' with { type: 'json' }
import process from '../../knowledge/process.json' with { type: 'json' }
import faqs from '../../knowledge/faqs.json' with { type: 'json' }
// Static imports are bundled once per Lambda cold start; no vector database or external retrieval cost.
export const knowledge = { profile, experience, skills, projects, certifications, services, posts, process, faqs }
export const knowledgeContext = JSON.stringify(knowledge)
