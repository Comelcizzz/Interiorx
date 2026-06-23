import { ReactNode } from 'react'
import { cn } from './cn'
export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon?: ReactNode
	title: string
	description?: string
	action?: ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-[rgba(255,255,255,0.55)] bg-white/28 px-8 py-12 text-center',
				className
			)}
		>
			{icon ? (
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/65 text-[var(--tds-muted)] shadow-[0_8px_24px_rgba(76,76,76,0.10)] [&_svg]:h-7 [&_svg]:w-7">
					{icon}
				</div>
			) : null}
			<div>
				<div className="text-base font-bold text-[var(--tds-ink)]">
					{title}
				</div>
				{description ? (
					<div className="mt-1.5 max-w-xs text-sm leading-5 text-[var(--tds-muted)]">
						{description}
					</div>
				) : null}
			</div>
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	)
}
