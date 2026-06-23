import { ReactNode } from 'react'
import { cn } from './cn'
export function PageHeader({
	title,
	description,
	actions,
	className,
}: {
	title: ReactNode
	description?: ReactNode
	actions?: ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-start justify-between gap-4',
				className
			)}
		>
			<div>
				<h1 className="text-2xl font-black tracking-tight text-[var(--tds-ink)] lg:text-3xl">
					{title}
				</h1>
				{description ? (
					<p className="mt-1.5 text-sm leading-6 text-[var(--tds-muted)]">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex flex-wrap items-center gap-2">
					{actions}
				</div>
			) : null}
		</div>
	)
}
