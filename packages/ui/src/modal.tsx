import { HTMLAttributes, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

export function Modal({
	open,
	onClose,
	title,
	children,
	className,
}: {
	open: boolean
	onClose: () => void
	title?: ReactNode
	children: ReactNode
	className?: string
}) {
	useEffect(() => {
		if (!open) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handler)
		const prev = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', handler)
			document.body.style.overflow = prev
		}
	}, [open, onClose])

	if (!open) return null

	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
			<div
				className="absolute inset-0 bg-[rgba(23,32,51,0.48)] backdrop-blur-sm"
				onClick={onClose}
				aria-hidden
			/>

			<div
				className={cn(
					'relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-white/75 bg-white/95 shadow-[20px_40px_80px_rgba(23,32,51,0.28)] backdrop-blur-xl',
					className
				)}
				role="dialog"
				aria-modal
			>
				{title ? (
					<div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
						<div className="text-lg font-black text-[var(--tds-ink)]">
							{title}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[var(--tds-muted)] transition hover:bg-slate-200 hover:text-[var(--tds-ink)]"
							aria-label="Закрити"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 14 14"
								fill="none"
							>
								<path
									d="M1 1l12 12M13 1L1 13"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>
				) : null}
				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
					{children}
				</div>
			</div>
		</div>,
		document.body
	)
}

export function ModalFooter({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'-mx-6 -mb-5 mt-6 flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white/80 px-6 py-4',
				className
			)}
			{...props}
		/>
	)
}
