import { Button, Modal, ModalFooter } from '@tailored/ui'
import { AlertTriangle } from 'lucide-react'

type Props = {
	open: boolean
	onClose: () => void
	onConfirm: () => void
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	tone?: 'default' | 'danger'
	busy?: boolean
}

export function ConfirmWarningModal({
	open,
	onClose,
	onConfirm,
	title,
	description,
	confirmLabel = 'Підтвердити',
	cancelLabel = 'Скасувати',
	tone = 'default',
	busy = false,
}: Props) {
	return (
		<Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
			<div className="flex gap-3">
				<AlertTriangle
					className={`mt-0.5 h-6 w-6 shrink-0 ${
						tone === 'danger' ? 'text-rose-600' : 'text-amber-600'
					}`}
					aria-hidden
				/>
				<p className="text-sm leading-6 text-slate-600">{description}</p>
			</div>
			<ModalFooter className="mt-5">
				<Button
					type="button"
					variant="ghost"
					disabled={busy}
					onClick={onClose}
				>
					{cancelLabel}
				</Button>
				<Button
					type="button"
					variant={tone === 'danger' ? 'danger' : 'primary'}
					disabled={busy}
					onClick={onConfirm}
				>
					{busy ? 'Виконуємо…' : confirmLabel}
				</Button>
			</ModalFooter>
		</Modal>
	)
}
