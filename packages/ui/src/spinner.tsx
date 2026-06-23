import { cn } from './cn'
const sizes = {
	sm: 'h-4 w-4 border-2',
	md: 'h-6 w-6 border-2',
	lg: 'h-9 w-9 border-[3px]',
} as const
export function Spinner({
	size = 'md',
	className,
}: {
	size?: keyof typeof sizes
	className?: string
}) {
	return (
		<div
			className={cn(
				'animate-spin rounded-full border-[var(--tds-primary)] border-t-transparent',
				sizes[size],
				className
			)}
			role="status"
			aria-label="Loading"
		/>
	)
}
export function PageLoader({ label = 'Завантаження...' }: { label?: string }) {
	return (
		<div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
			<Spinner size="lg" />
			<span className="text-sm text-[var(--tds-muted)]">{label}</span>
		</div>
	)
}
