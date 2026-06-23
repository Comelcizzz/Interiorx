import { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('tds-glass-card rounded-[20px]', className)}
			{...props}
		/>
	)
}
export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('border-b border-white/55 px-5 py-4', className)}
			{...props}
		/>
	)
}
export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('px-5 py-4', className)} {...props} />
}
export function CardGrid({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'grid gap-5 sm:grid-cols-2 xl:grid-cols-4',
				className
			)}
			{...props}
		/>
	)
}
export function MetricCard({
	label,
	value,
	icon,
	detail,
	tone = 'primary',
	className,
}: HTMLAttributes<HTMLDivElement> & {
	label: ReactNode
	value: ReactNode
	icon?: ReactNode
	detail?: ReactNode
	tone?: 'primary' | 'copper' | 'blue' | 'neutral'
}) {
	const toneClass = {
		primary: 'bg-[rgba(38,132,91,0.12)] text-[var(--tds-primary)]',
		copper: 'bg-[rgba(183,121,76,0.14)] text-[var(--tds-copper)]',
		blue: 'bg-[rgba(57,104,170,0.12)] text-[#3968aa]',
		neutral: 'bg-white/65 text-[var(--tds-muted)]',
	}
	return (
		<Card className={cn('overflow-hidden p-5', className)}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="text-sm font-medium text-[var(--tds-muted)]">
						{label}
					</div>
					<div className="mt-3 text-3xl font-semibold tracking-normal text-[var(--tds-ink)]">
						{value}
					</div>
				</div>
				{icon ? (
					<div
						className={cn(
							'flex h-11 w-11 items-center justify-center rounded-full',
							toneClass[tone]
						)}
					>
						{icon}
					</div>
				) : null}
			</div>
			{detail ? (
				<div className="mt-4 text-sm text-[var(--tds-muted)]">
					{detail}
				</div>
			) : null}
		</Card>
	)
}
