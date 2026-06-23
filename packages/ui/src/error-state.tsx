import { AlertTriangle } from 'lucide-react'
import { cn } from './cn'
export function ErrorState({
	message,
	className,
}: {
	message?: string
	className?: string
}) {
	return (
		<div
			className={cn(
				'flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[20px] border border-rose-200/60 bg-rose-50/60 px-6 py-8 text-center',
				className
			)}
		>
			<div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
				<AlertTriangle className="h-5 w-5" />
			</div>
			<div>
				<div className="text-sm font-bold text-rose-800">
					Помилка завантаження
				</div>
				{message ? (
					<div className="mt-1 text-xs text-rose-600">{message}</div>
				) : null}
			</div>
		</div>
	)
}
