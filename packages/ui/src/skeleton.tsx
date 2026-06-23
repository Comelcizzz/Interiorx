import { HTMLAttributes } from 'react'
import { cn } from './cn'
export function Skeleton({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'animate-pulse rounded-[12px] bg-gradient-to-r from-white/60 via-white/90 to-white/60 bg-[length:200%_100%]',
				className
			)}
			style={{ animationDuration: '1.6s' }}
			{...props}
		/>
	)
}
export function SkeletonCard({ className }: { className?: string }) {
	return (
		<div className={cn('tds-glass-card rounded-[20px] p-5', className)}>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-3">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-32" />
				</div>
				<Skeleton className="h-11 w-11 rounded-full" />
			</div>
			<Skeleton className="mt-4 h-3 w-40" />
		</div>
	)
}
export function SkeletonRow({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'flex items-center gap-4 border-b border-white/40 py-4 last:border-0',
				className
			)}
		>
			<Skeleton className="h-9 w-9 rounded-full shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-3 w-32" />
			</div>
			<Skeleton className="h-6 w-20 rounded-full" />
		</div>
	)
}
export function SkeletonTable({
	rows = 5,
	cols = 4,
}: {
	rows?: number
	cols?: number
}) {
	return (
		<div className="space-y-0">
			<div className="flex gap-4 border-b border-white/50 pb-3">
				{Array.from({ length: cols }).map((_, i) => (
					<Skeleton
						key={i}
						className="h-3 flex-1"
						style={{ opacity: 0.7 }}
					/>
				))}
			</div>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={i}
					className="flex gap-4 border-b border-white/30 py-4 last:border-0"
				>
					{Array.from({ length: cols }).map((_, j) => (
						<Skeleton
							key={j}
							className="h-4 flex-1"
							style={{
								maxWidth: j === 0 ? '180px' : undefined,
								opacity: 0.5 + (j % 2) * 0.2,
							}}
						/>
					))}
				</div>
			))}
		</div>
	)
}
