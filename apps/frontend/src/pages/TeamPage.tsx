import { Card, CardContent, PageHeader } from '@tailored/ui'
import { PublicHeader } from '@/components/PublicHeader'
import { publicApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'

type PublicTeamMember = {
	id: string
	fullName: string
	headline: string
	roleCode: string
	roleName: string
	specialization: string
}

type TeamResponse = {
	items: PublicTeamMember[]
}

export function TeamPage() {
	const { data, loading, error } = useLoad(
		() => publicApi.get<TeamResponse>('/team').then((r) => r.data),
		[]
	)

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
				<PageHeader
					title="Команда"
					description="Ключові спеціалісти, які ведуть проєкт від заявки до здачі."
				/>
				{loading ? (
					<p className="text-sm text-slate-500">Завантажуємо команду...</p>
				) : null}
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}
				<div className="grid gap-4 sm:grid-cols-2">
					{(data?.items ?? []).map((member) => (
						<Card key={member.id}>
							<CardContent>
								<div className="font-bold">{member.fullName}</div>
								<div className="text-sm font-semibold text-slate-700">
									{member.headline}
								</div>
								<p className="mt-2 text-sm text-slate-600">
									{member.specialization}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</main>
		</div>
	)
}
