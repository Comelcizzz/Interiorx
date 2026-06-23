export type OrderWorkspaceAction = 'qualify' | 'convert' | 'reject' | 'claim'

export type ConfirmCopy = {
	title: string
	description: string
	confirmLabel: string
	tone: 'default' | 'danger'
}

export function orderActionConfirm(
	action: OrderWorkspaceAction,
	code: string
): ConfirmCopy {
	switch (action) {
		case 'qualify':
			return {
				title: 'Кваліфікувати заявку?',
				description: `Заявка ${code} перейде в статус «Кваліфікована». Клієнт побачить оновлення в кабінеті.`,
				confirmLabel: 'Кваліфікувати',
				tone: 'default',
			}
		case 'convert':
			return {
				title: 'Конвертувати в проєкт?',
				description: `Для заявки ${code} буде створено проєкт TDS-PRJ у статусі «Чернетка». Заявка стане «Конвертована».`,
				confirmLabel: 'Конвертувати',
				tone: 'default',
			}
		case 'reject':
			return {
				title: 'Відхилити заявку?',
				description: `Заявка ${code} буде закрита без проєкту. Цю дію не можна скасувати з інтерфейсу.`,
				confirmLabel: 'Відхилити',
				tone: 'danger',
			}
		case 'claim':
			return {
				title: 'Закріпити заявку?',
				description: `Ви станете відповідальним дизайнером для ${code}. Менеджер побачить це в CRM.`,
				confirmLabel: 'Закріпити',
				tone: 'default',
			}
	}
}
