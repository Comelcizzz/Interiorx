import { HTMLAttributes } from 'react'
import { cn } from './cn'
export function BrandMark({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'tds-brand-mark relative grid place-items-center',
				className
			)}
			{...props}
		>
			<svg
				viewBox="0 0 72 72"
				aria-hidden="true"
				className="h-full w-full"
			>
				<path
					d="M9 18.6 18.4 9h35.2L63 18.6v34.8L53.6 63H18.4L9 53.4V18.6Z"
					fill="#f8f4ed"
					stroke="rgba(17,24,39,.18)"
					strokeWidth="2"
				/>
				<path
					d="M18 22h36M18 50h36M22 18v36M50 18v36"
					stroke="rgba(38,132,91,.18)"
					strokeWidth="2"
				/>
				<path d="M20 22h32v8H40v25h-9V30H20v-8Z" fill="#172033" />
				<path
					d="M49.5 18.5 18.5 49.5"
					stroke="#b7794c"
					strokeLinecap="round"
					strokeWidth="4.2"
				/>
				<path
					d="M49 37v14H35"
					fill="none"
					stroke="#26845b"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="4"
				/>
				<path
					d="M18 18.5h12"
					stroke="#26845b"
					strokeLinecap="round"
					strokeWidth="4"
				/>
			</svg>
		</div>
	)
}
export function BrandLockup({
	className,
	compact = false,
}: {
	className?: string
	compact?: boolean
}) {
	return (
		<div className={cn('flex items-center gap-3', className)}>
			<BrandMark className={compact ? 'h-10 w-10' : 'h-12 w-12'} />
			<div className="min-w-0">
				<div
					className={cn(
						'tds-logo-word truncate font-black tracking-normal text-[var(--tds-ink)]',
						compact ? 'text-base' : 'text-xl'
					)}
				>
					INTERIORIX
				</div>
				<div
					className={cn(
						'tds-logo-subline truncate font-semibold text-[var(--tds-muted)]',
						compact ? 'text-[10px]' : 'text-[11px]'
					)}
				>
					Interior studio
				</div>
			</div>
		</div>
	)
}
