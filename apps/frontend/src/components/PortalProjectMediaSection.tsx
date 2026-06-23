import { Card, CardContent, CardHeader } from '@tailored/ui'
import { Camera, Palette } from 'lucide-react'
import { portalApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'
import {
	PortalMediaGallery,
	type MediaReportRow,
} from '@/components/PortalMediaGallery'

type ListResp = { items: MediaReportRow[]; total: number }

function MediaBlock({
	title,
	description,
	icon: Icon,
	variant,
	code,
}: {
	title: string
	description: string
	icon: typeof Camera
	variant: 'site' | 'design'
	code: string
}) {
	const { data, loading, error } = useLoad(
		() =>
			portalApi
				.get<ListResp>(
					`/projects/${encodeURIComponent(code)}/photo-reports?page=1&perPage=24&category=${variant === 'site' ? 'SITE' : 'DESIGN'}`
				)
				.then((r) => r.data),
		[code, variant]
	)

	const total = data?.total ?? 0

	return (
		<Card>
			<CardHeader className="border-b border-slate-100 pb-4">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
						<Icon className="h-5 w-5 text-slate-600" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-base font-semibold text-slate-950">
								{title}
							</h2>
							{!loading && total > 0 ? (
								<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
									{total}
								</span>
							) : null}
						</div>
						<p className="mt-1 text-sm text-slate-500">{description}</p>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-5">
				<PortalMediaGallery
					items={data?.items ?? []}
					loading={loading}
					error={error}
					variant={variant}
					emptyLabel={
						variant === 'design'
							? 'Плани, візуалізації та інші дизайн-матеріали зʼявляться тут після завантаження командою.'
							: 'Фото з будмайданчика та ходу робіт зʼявляться тут після завантаження бригадою.'
					}
				/>
			</CardContent>
		</Card>
	)
}

export function PortalProjectMediaSection({ code }: { code: string }) {
	return (
		<div className="space-y-6">
			<MediaBlock
				code={code}
				variant="design"
				title="Дизайн-файли"
				description="Плани, візуалізації та матеріали від дизайнера."
				icon={Palette}
			/>
			<MediaBlock
				code={code}
				variant="site"
				title="Фото з обʼєкта"
				description="Фотозвіти з будмайданчика та етапів виконання робіт."
				icon={Camera}
			/>
		</div>
	)
}
