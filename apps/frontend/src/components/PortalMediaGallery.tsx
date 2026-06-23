import { formatDateTime } from '@tailored/shared'
import { Calendar, ImageIcon, Layers, Palette } from 'lucide-react'
import { mediaUrl } from '@/lib/api'

export type MediaReportRow = {
	id: string
	caption: string
	photoUrls: string[]
	missingCount?: number
	createdAt?: string
}

function photoCountLabel(n: number, variant: 'site' | 'design') {
	if (n === 1) return variant === 'design' ? '1 файл' : '1 фото'
	const mod10 = n % 10
	const mod100 = n % 100
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return variant === 'design' ? `${n} файли` : `${n} фото`
	}
	return variant === 'design' ? `${n} файлів` : `${n} фото`
}

function MediaCard({
	row,
	variant,
}: {
	row: MediaReportRow
	variant: 'site' | 'design'
}) {
	const urls = row.photoUrls
	const count = urls.length
	const title =
		row.caption?.trim() ||
		(variant === 'design' ? 'Дизайн-матеріали' : 'Фотозвіт з обʼєкта')
	const addedAt = row.createdAt ? formatDateTime(row.createdAt) : null

	return (
		<article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:shadow-md">
			<div className="relative bg-slate-100">
				{count === 1 ? (
					<a
						href={mediaUrl(urls[0])}
						target="_blank"
						rel="noreferrer"
						className="block aspect-[16/10] overflow-hidden"
					>
						<img
							src={mediaUrl(urls[0])}
							alt=""
							className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
						/>
					</a>
				) : count === 2 ? (
					<div className="grid grid-cols-2 gap-0.5">
						{urls.map((u) => (
							<a
								key={u}
								href={mediaUrl(u)}
								target="_blank"
								rel="noreferrer"
								className="relative block aspect-[4/3] overflow-hidden bg-slate-200"
							>
								<img
									src={mediaUrl(u)}
									alt=""
									className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
								/>
							</a>
						))}
					</div>
				) : count === 3 ? (
					<div className="grid grid-cols-2 grid-rows-2 gap-0.5">
						<a
							href={mediaUrl(urls[0])}
							target="_blank"
							rel="noreferrer"
							className="relative row-span-2 block overflow-hidden bg-slate-200"
						>
							<img
								src={mediaUrl(urls[0])}
								alt=""
								className="h-full min-h-[140px] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
							/>
						</a>
						{urls.slice(1, 3).map((u) => (
							<a
								key={u}
								href={mediaUrl(u)}
								target="_blank"
								rel="noreferrer"
								className="relative block aspect-[4/3] overflow-hidden bg-slate-200"
							>
								<img
									src={mediaUrl(u)}
									alt=""
									className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
								/>
							</a>
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-0.5">
						{urls.slice(0, 4).map((u, i) => (
							<a
								key={u}
								href={mediaUrl(u)}
								target="_blank"
								rel="noreferrer"
								className="relative block aspect-square overflow-hidden bg-slate-200"
							>
								<img
									src={mediaUrl(u)}
									alt=""
									className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
								/>
								{count > 4 && i === 3 ? (
									<span className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-lg font-semibold text-white">
										+{count - 4}
									</span>
								) : null}
							</a>
						))}
					</div>
				)}
				{count > 1 ? (
					<span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
						{photoCountLabel(count, variant)}
					</span>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-2 border-t border-slate-100 px-4 py-3.5">
				<h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
					{title}
				</h3>
				<div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
					{addedAt ? (
						<span className="inline-flex items-center gap-1.5">
							<Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
							<span>
								Додано{' '}
								<time dateTime={row.createdAt}>{addedAt}</time>
							</span>
						</span>
					) : (
						<span className="text-slate-400">Дата не вказана</span>
					)}
					{count > 1 ? (
						<span className="inline-flex items-center gap-1 text-slate-400">
							<Layers className="h-3.5 w-3.5" />
							{photoCountLabel(count, variant)}
						</span>
					) : null}
				</div>
				{row.missingCount && row.missingCount > 0 ? (
					<p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
						{row.missingCount} файл(ів) тимчасово недоступно
					</p>
				) : null}
			</div>
		</article>
	)
}

export function PortalMediaGallery({
	items,
	loading,
	error,
	emptyLabel,
	variant,
}: {
	items: MediaReportRow[]
	loading?: boolean
	error?: string | null
	emptyLabel: string
	variant: 'site' | 'design'
}) {
	if (error) {
		return <p className="text-sm text-rose-600">{error}</p>
	}
	if (loading) {
		return <p className="text-sm text-slate-500">Завантажуємо…</p>
	}
	if (items.length === 0) {
		const Icon = variant === 'design' ? Palette : ImageIcon
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
				<Icon className="mb-3 h-11 w-11 text-slate-300" />
				<p className="max-w-sm text-sm text-slate-600">{emptyLabel}</p>
			</div>
		)
	}

	return (
		<div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
			{items.map((row) => (
				<MediaCard key={row.id} row={row} variant={variant} />
			))}
		</div>
	)
}
