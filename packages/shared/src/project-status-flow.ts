/** Дозволені переходи статусу проєкту (дзеркало backend project-state-machine). */
export const projectStatusNext: Record<string, string[]> = {
	DRAFT: ['ESTIMATION', 'CANCELLED'],
	ESTIMATION: ['DESIGN', 'PAUSED', 'CANCELLED'],
	DESIGN: ['APPROVED', 'PAUSED', 'CANCELLED'],
	APPROVED: ['IN_PROGRESS', 'PAUSED', 'CANCELLED'],
	IN_PROGRESS: ['COMPLETED', 'PAUSED', 'CANCELLED'],
	PAUSED: ['IN_PROGRESS', 'DESIGN', 'CANCELLED'],
	COMPLETED: ['WARRANTY'],
	WARRANTY: [],
	CANCELLED: [],
}
