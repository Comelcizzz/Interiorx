import { ProjectStatus } from './enums'
const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
	[ProjectStatus.DRAFT]: [ProjectStatus.ESTIMATION, ProjectStatus.CANCELLED],
	[ProjectStatus.ESTIMATION]: [
		ProjectStatus.DESIGN,
		ProjectStatus.PAUSED,
		ProjectStatus.CANCELLED,
	],
	[ProjectStatus.DESIGN]: [
		ProjectStatus.APPROVED,
		ProjectStatus.PAUSED,
		ProjectStatus.CANCELLED,
	],
	[ProjectStatus.APPROVED]: [
		ProjectStatus.IN_PROGRESS,
		ProjectStatus.PAUSED,
		ProjectStatus.CANCELLED,
	],
	[ProjectStatus.IN_PROGRESS]: [
		ProjectStatus.COMPLETED,
		ProjectStatus.PAUSED,
		ProjectStatus.CANCELLED,
	],
	[ProjectStatus.PAUSED]: [
		ProjectStatus.IN_PROGRESS,
		ProjectStatus.DESIGN,
		ProjectStatus.CANCELLED,
	],
	[ProjectStatus.COMPLETED]: [ProjectStatus.WARRANTY],
	[ProjectStatus.WARRANTY]: [],
	[ProjectStatus.CANCELLED]: [],
}
export function canTransitionProject(from: string, to: string): boolean {
	const next = PROJECT_STATUS_TRANSITIONS[from as ProjectStatus]
	return next ? next.includes(to as ProjectStatus) : false
}
export function allowedProjectStatusTargets(from: string): ProjectStatus[] {
	return PROJECT_STATUS_TRANSITIONS[from as ProjectStatus] ?? []
}
