import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from './cn'
export const Input = forwardRef<
	HTMLInputElement,
	InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
	<input
		ref={ref}
		className={cn(
			'h-10 w-full rounded-full border border-white/75 bg-white/72 px-4 text-sm text-[var(--tds-ink)] outline-none transition placeholder:text-[var(--tds-muted)] focus:border-[var(--tds-primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(38,132,91,0.12)]',
			className
		)}
		{...props}
	/>
))
Input.displayName = 'Input'
