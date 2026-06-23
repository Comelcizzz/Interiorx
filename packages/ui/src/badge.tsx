import { HTMLAttributes } from 'react'
import { cn } from './cn'
const toneClass = {
	neutral: 'border-white/70 bg-white/65 text-[var(--tds-muted)]',
	green: 'border-emerald-200/70 bg-emerald-50/90 text-emerald-800',
	amber: 'border-amber-200/70 bg-amber-50/90 text-amber-800',
	red: 'border-rose-200/70 bg-rose-50/90 text-rose-800',
	blue: 'border-sky-200/70 bg-sky-50/90 text-sky-800',
}
export function Badge({
	className,
	tone = 'neutral',
	...props
}: HTMLAttributes<HTMLSpanElement> & {
	tone?: keyof typeof toneClass
}) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[0_8px_18px_rgba(76,76,76,0.08)]',
				toneClass[tone],
				className
			)}
			{...props}
		/>
	)
}
