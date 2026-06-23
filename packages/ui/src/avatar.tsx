import { HTMLAttributes } from 'react'
import { cn } from './cn'
const toneClass = {
	primary: 'bg-[rgba(38,132,91,0.18)] text-[var(--tds-primary)]',
	blue: 'bg-[rgba(57,104,170,0.15)] text-[#3968aa]',
	copper: 'bg-[rgba(183,121,76,0.15)] text-[var(--tds-copper)]',
	red: 'bg-[rgba(180,70,70,0.14)] text-[#b44646]',
	neutral: 'bg-white/65 text-[var(--tds-muted)]',
} as const
type AvatarTone = keyof typeof toneClass
function getInitials(name: string): string {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')
}
const sizeClass = {
	sm: 'h-7 w-7 text-[11px]',
	md: 'h-9 w-9 text-sm',
	lg: 'h-11 w-11 text-base',
	xl: 'h-14 w-14 text-lg',
} as const
type AvatarSize = keyof typeof sizeClass
export function Avatar({
	name,
	tone = 'primary',
	size = 'md',
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & {
	name: string
	tone?: AvatarTone
	size?: AvatarSize
}) {
	return (
		<div
			className={cn(
				'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
				'border border-white/60 shadow-[0_4px_12px_rgba(76,76,76,0.10)]',
				sizeClass[size],
				toneClass[tone],
				className
			)}
			title={name}
			{...props}
		>
			{getInitials(name)}
		</div>
	)
}
