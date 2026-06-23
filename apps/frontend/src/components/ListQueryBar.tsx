import { Button, Input } from '@tailored/ui'
import { sortLabels, type ListSort } from '@tailored/shared'
import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { SearchableSelect } from '@/components/SearchableSelect'

export type ListQueryBarValues = {
	status: string
	q: string
	from: string
	to: string
	sort: ListSort
}

type Props = {
	values: ListQueryBarValues
	onApply: (next: ListQueryBarValues) => void
	onReset: () => void
	statusOptions?: Array<{ value: string; label: string }>
	showSearch?: boolean
	showDateRange?: boolean
	showSort?: boolean
	searchPlaceholder?: string
	extraFields?: ReactNode
}

const sortOptions = [
	{ value: 'latest', label: sortLabels.latest },
	{ value: 'oldest', label: sortLabels.oldest },
]

export function ListQueryBar({
	values,
	onApply,
	onReset,
	statusOptions,
	showSearch = false,
	showDateRange = true,
	showSort = true,
	searchPlaceholder = 'Пошук…',
	extraFields,
}: Props) {
	const [draft, setDraft] = useState(values)
	useEffect(() => setDraft(values), [values])

	function submit(e: FormEvent) {
		e.preventDefault()
		onApply(draft)
	}

	return (
		<form
			className="flex flex-wrap items-end gap-3 rounded-[14px] border border-white/60 bg-white/40 p-4"
			onSubmit={submit}
		>
			{statusOptions && statusOptions.length > 0 ? (
				<label className="block min-w-[140px]">
					<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
						Статус
					</span>
					<SearchableSelect
						value={draft.status}
						onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
						options={[{ value: '', label: 'Усі' }, ...statusOptions]}
					/>
				</label>
			) : null}
			{showSearch ? (
				<label className="block min-w-[180px] flex-1">
					<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
						Пошук
					</span>
					<Input
						value={draft.q}
						onChange={(e) =>
							setDraft((d) => ({ ...d, q: e.target.value }))
						}
						placeholder={searchPlaceholder}
					/>
				</label>
			) : null}
			{extraFields}
			{showDateRange ? (
				<>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
							Від
						</span>
						<Input
							type="date"
							value={draft.from}
							onChange={(e) =>
								setDraft((d) => ({ ...d, from: e.target.value }))
							}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
							До
						</span>
						<Input
							type="date"
							value={draft.to}
							onChange={(e) =>
								setDraft((d) => ({ ...d, to: e.target.value }))
							}
						/>
					</label>
				</>
			) : null}
			{showSort ? (
				<label className="block min-w-[160px]">
					<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
						Сортування
					</span>
					<SearchableSelect
						value={draft.sort}
						onChange={(v) =>
							setDraft((d) => ({
								...d,
								sort: v === 'oldest' ? 'oldest' : 'latest',
							}))
						}
						options={sortOptions}
					/>
				</label>
			) : null}
			<div className="flex gap-2 pb-0.5">
				<Button type="submit">Застосувати</Button>
				<Button
					type="button"
					variant="secondary"
					onClick={() => {
						setDraft({
							status: '',
							q: '',
							from: '',
							to: '',
							sort: 'latest',
						})
						onReset()
					}}
				>
					Скинути
				</Button>
			</div>
		</form>
	)
}
