import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from './cn'
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant
	icon?: ReactNode
	shadowColor?: string
}
const variants: Record<ButtonVariant, string> = {
	primary:
		'border border-[rgba(255,255,255,0.72)] bg-[var(--tds-primary)] text-white hover:bg-[var(--tds-primary-strong)]',
	secondary:
		'border border-[rgba(255,255,255,0.75)] bg-white/72 text-[var(--tds-ink)] hover:bg-white',
	ghost: 'text-[var(--tds-muted)] hover:bg-white/55 hover:text-[var(--tds-ink)]',
	danger: 'border border-rose-200 bg-rose-600 text-white hover:bg-rose-700',
	glass: 'tds-glass-control text-[var(--tds-ink)] hover:text-[var(--tds-primary)]',
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = 'primary',
			icon,
			shadowColor,
			children,
			style,
			...props
		},
		ref
	) => {
		const boxShadow =
			variant === 'primary'
				? `10px 20px 40px 0 ${shadowColor ?? 'rgba(38, 132, 91, 0.24)'}`
				: undefined
		return (
			<button
				ref={ref}
				type={props.type ?? 'button'}
				style={{ boxShadow, ...style }}
				className={cn(
					'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold leading-none transition duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4',
					'active:translate-y-px',
					variants[variant],
					className
				)}
				{...props}
			>
				{icon}
				{children}
			</button>
		)
	}
)
Button.displayName = 'Button'
