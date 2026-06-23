import { Card, CardContent, CardHeader } from '@tailored/ui'
import { FileImage } from 'lucide-react'
import { useState } from 'react'
import { ProjectPhotoReportsSection } from '@/components/ProjectPhotoReportsSection'

type Tab = 'site' | 'design'

export function ProjectDocumentsSection({ projectId }: { projectId: string }) {
	const [tab, setTab] = useState<Tab>('site')

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2 font-medium text-slate-950">
						<FileImage className="h-4 w-4 text-slate-600" />
						Фото та дизайн
					</div>
					<div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
						<button
							type="button"
							onClick={() => setTab('site')}
							className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
								tab === 'site'
									? 'bg-white text-slate-900 shadow-sm'
									: 'text-slate-600 hover:text-slate-900'
							}`}
						>
							Фото з обʼєкта
						</button>
						<button
							type="button"
							onClick={() => setTab('design')}
							className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
								tab === 'design'
									? 'bg-white text-slate-900 shadow-sm'
									: 'text-slate-600 hover:text-slate-900'
							}`}
						>
							Дизайн-файли
						</button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{tab === 'site' ? (
					<ProjectPhotoReportsSection
						key="site"
						projectId={projectId}
						category="SITE"
						embedded
					/>
				) : (
					<ProjectPhotoReportsSection
						key="design"
						projectId={projectId}
						category="DESIGN"
						embedded
					/>
				)}
			</CardContent>
		</Card>
	)
}
