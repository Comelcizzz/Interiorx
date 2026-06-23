import { formatNumber } from '@tailored/shared'
import type { ConfirmCopy } from './order-action-confirm'
import { estimateKindLabel } from './estimate-display'

export function estimateSendConfirm(opts: {
	projectCode?: string
	version?: number
	total?: string
}): ConfirmCopy {
	const ref = opts.projectCode ? ` (${opts.projectCode})` : ''
	const kind =
		opts.version != null
			? estimateKindLabel(opts.version)
			: 'Кошторис'
	const sum = opts.total
		? ` на суму ${formatNumber(opts.total)} UAH`
		: ''
	const isAdditional = (opts.version ?? 1) > 1
	return {
		title: isAdditional
			? 'Надіслати додатковий кошторис?'
			: 'Надіслати основний кошторис?',
		description: `${kind}${ref}${sum} з’явиться в кабінеті клієнта для перегляду та погодження. Переконайтесь, що позиції та сума вірні.`,
		confirmLabel: 'Надіслати',
		tone: 'default',
	}
}
