export function FormModalSteps({ steps }: { steps: string[] }) {
	return (
		<ol className="mb-5 space-y-2 rounded-xl border border-emerald-100/90 bg-emerald-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
			{steps.map((step, index) => (
				<li key={index} className="flex gap-2">
					<span className="shrink-0 font-black text-emerald-800">
						{index + 1}.
					</span>
					<span>{step}</span>
				</li>
			))}
		</ol>
	)
}
