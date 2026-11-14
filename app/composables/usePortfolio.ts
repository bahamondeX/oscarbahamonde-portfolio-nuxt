import experienceData from '../../data/experience.json'
import projectData from '../../data/projects.json'
import skillGroups from '../../data/skills.json'

// Shared, source-backed catalog. Components and assistant knowledge use this data.
export const experience = experienceData
export const projects = projectData
export const skills = skillGroups.flatMap(group => group.skills)
