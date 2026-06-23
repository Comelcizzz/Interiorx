import { projectStatusLabels } from '@tailored/shared'
import type { ConfirmCopy } from './order-action-confirm'

export function projectStatusConfirm(
	currentStatus: string,
	nextStatus: string,
	projectCode?: string
): ConfirmCopy {
	const nextLabel =
		projectStatusLabels[nextStatus as keyof typeof projectStatusLabels] ??
		nextStatus
	const ref = projectCode ? ` ${projectCode}` : ''

	if (nextStatus === 'CANCELLED') {
		return {
			title: 'Скасувати проєкт?',
			description: `Проєкт${ref} буде переведено в «Скасовано». Подальша робота по ньому зупиняється.`,
			confirmLabel: 'Скасувати проєкт',
			tone: 'danger',
		}
	}
	if (nextStatus === 'PAUSED') {
		return {
			title: 'Поставити на паузу?',
			description: `Проєкт${ref} тимчасово зупиняється. Пізніше можна повернути в роботу.`,
			confirmLabel: 'На паузу',
			tone: 'default',
		}
	}
	return {
		title: 'Змінити етап проєкту?',
		description: `Перевести проєкт${ref} з «${
			projectStatusLabels[
				currentStatus as keyof typeof projectStatusLabels
			] ?? currentStatus
		}» у «${nextLabel}»?`,
		confirmLabel: `→ ${nextLabel}`,
		tone: 'default',
	}
}
