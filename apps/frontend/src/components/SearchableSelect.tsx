import { Button, Input, cn } from '@tailored/ui'
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const SEARCHABLE_SELECT_PAGE_SIZE = 10

export type SearchableSelectOption = {
	value: string
	label: string
	/** Додатковий текст для пошуку (код, email тощо) */
	searchText?: string
}

type PanelPos = {
	top: number
	left: number
	width: number
}

export function SearchableSelect({
	value,
	onChange,
	options,
	placeholder = 'Оберіть…',
	searchPlaceholder = 'Пошук…',
	emptyLabel = 'Нічого не знайдено',
	loadMoreLabel = 'Завантажити ще',
	pageSize = SEARCHABLE_SELECT_PAGE_SIZE,
	disabled,
	className,
}: {
	value: string
	onChange: (value: string) => void
	options: SearchableSelectOption[]
	placeholder?: string
	searchPlaceholder?: string
	emptyLabel?: string
	loadMoreLabel?: string
	pageSize?: number
	disabled?: boolean
	className?: string
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [visibleCount, setVisibleCount] = useState(pageSize)
	const [panelPos, setPanelPos] = useState<PanelPos | null>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const listId = useId()

	const selected = options.find((o) => o.value === value)
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options
		return options.filter((o) => {
			const hay = `${o.label} ${o.searchText ?? ''} ${o.value}`.toLowerCase()
			return hay.includes(q)
		})
	}, [options, query])

	const visible = useMemo(
		() => filtered.slice(0, visibleCount),
		[filtered, visibleCount]
	)
	const hasMore = filtered.length > visibleCount
	const remaining = filtered.length - visibleCount

	const syncPanelPos = useCallback(() => {
		const el = triggerRef.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		setPanelPos({
			top: rect.bottom + 4,
			left: rect.left,
			width: rect.width,
		})
	}, [])

	useEffect(() => {
		if (!open) return
		syncPanelPos()
		const onLayout = () => syncPanelPos()
		window.addEventListener('resize', onLayout)
		window.addEventListener('scroll', onLayout, true)
		return () => {
			window.removeEventListener('resize', onLayout)
			window.removeEventListener('scroll', onLayout, true)
		}
	}, [open, syncPanelPos])

	useEffect(() => {
		if (!open) return
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node
			if (
				triggerRef.current?.contains(t) ||
				panelRef.current?.contains(t)
			) {
				return
			}
			setOpen(false)
			setQuery('')
		}
		document.addEventListener('mousedown', onDoc)
		return () => document.removeEventListener('mousedown', onDoc)
	}, [open])

	useEffect(() => {
		if (open) setVisibleCount(pageSize)
	}, [open, pageSize])

	useEffect(() => {
		setVisibleCount(pageSize)
	}, [query, pageSize, options.length])

	function pick(next: string) {
		onChange(next)
		setOpen(false)
		setQuery('')
	}

	const dropdownPanel =
		open && panelPos ? (
			<div
				ref={panelRef}
				id={listId}
				role="listbox"
				style={{
					position: 'fixed',
					top: panelPos.top,
					left: panelPos.left,
					width: panelPos.width,
					zIndex: 9999,
				}}
				className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
			>
				<div className="border-b border-slate-100 p-2">
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={searchPlaceholder}
						autoFocus
						className="h-9 text-sm"
					/>
				</div>
				<ul className="max-h-52 overflow-y-auto py-1">
					{visible.length === 0 ? (
						<li className="px-3 py-2 text-sm text-slate-500">
							{emptyLabel}
						</li>
					) : (
						visible.map((o) => (
							<li key={o.value || '__empty__'}>
								<button
									type="button"
									role="option"
									aria-selected={o.value === value}
									onClick={() => pick(o.value)}
									className={cn(
										'flex w-full px-3 py-2 text-left text-sm transition hover:bg-emerald-50',
										o.value === value &&
											'bg-emerald-50/80 font-semibold text-[var(--tds-primary)]'
									)}
								>
									{o.label}
								</button>
							</li>
						))
					)}
				</ul>
				{hasMore ? (
					<div className="border-t border-slate-100 p-2">
						<Button
							type="button"
							variant="ghost"
							className="h-9 w-full text-sm"
							onClick={() =>
								setVisibleCount((n) => n + pageSize)
							}
						>
							{loadMoreLabel}
							<span className="ml-1 text-slate-500">
								(+{Math.min(remaining, pageSize)})
							</span>
						</Button>
					</div>
				) : null}
			</div>
		) : null

	return (
		<div className={cn('relative', className)}>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				onClick={() => {
					setOpen((v) => {
						const next = !v
						if (next) syncPanelPos()
						return next
					})
				}}
				className={cn(
					'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition',
					disabled
						? 'cursor-not-allowed opacity-60'
						: 'hover:border-[var(--tds-primary)]/40',
					!selected?.label && 'text-slate-500'
				)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
			>
				<span className="truncate">
					{selected?.label ?? placeholder}
				</span>
				<ChevronDown
					className={cn(
						'h-4 w-4 shrink-0 text-slate-500 transition',
						open && 'rotate-180'
					)}
				/>
			</button>

			{typeof document !== 'undefined' && dropdownPanel
				? createPortal(dropdownPanel, document.body)
				: null}
		</div>
	)
}

/** Опції «на сторінці» для таблиць */
export function perPageSelectOptions(
	values: readonly number[]
): SearchableSelectOption[] {
	return values.map((n) => ({
		value: String(n),
		label: String(n),
	}))
}
