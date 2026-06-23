import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from './cn'
export const Select = forwardRef<
	HTMLSelectElement,
	SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
	<select
		ref={ref}
		className={cn(
			'h-10 w-full appearance-none rounded-full border border-white/75 bg-white/72 px-4 pr-9 text-sm text-[var(--tds-ink)] outline-none transition',
			'placeholder:text-[var(--tds-muted)]',
			'focus:border-[var(--tds-primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(38,132,91,0.12)]',
			"bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23747b87' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] bg-[right_14px_center] bg-no-repeat",
			className
		)}
		{...props}
	/>
))
Select.displayName = 'Select'
