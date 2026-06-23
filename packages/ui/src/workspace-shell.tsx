import { HTMLAttributes, ReactNode, useMemo, useState } from 'react'
import { cn } from './cn'
export type WorkspaceNavItem = {
	to: string
	label: string
	icon?: ReactNode
	group?: string
}
export type WorkspaceShellProps = HTMLAttributes<HTMLDivElement> & {
	brand: ReactNode
	subtitle?: ReactNode
	nav: WorkspaceNavItem[]
	activePath: string
	onNavigate: (path: string) => void
	userName?: ReactNode
	userRole?: ReactNode
	toolbar?: ReactNode
	sidebarNote?: ReactNode
	children: ReactNode
}
const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/'

/** Longest matching nav path wins (e.g. /orders/new over /orders). */
const resolveActiveNavTo = (
	current: string,
	items: WorkspaceNavItem[]
): string | null => {
	const active = normalizePath(current)
	let best: string | null = null
	let bestLen = -1
	for (const item of items) {
		const target = normalizePath(item.to)
		const matches =
			active === target ||
			(target !== '/' && active.startsWith(`${target}/`))
		if (matches && target.length > bestLen) {
			best = item.to
			bestLen = target.length
		}
	}
	return best
}
export function WorkspaceShell({
	brand,
	subtitle,
	nav,
	activePath,
	onNavigate,
	userName,
	userRole,
	toolbar,
	sidebarNote,
	children,
	className,
}: WorkspaceShellProps) {
	const [mobileOpen, setMobileOpen] = useState(false)
	const [collapsed, setCollapsed] = useState(false)
	const groups = useMemo(() => {
		const result = new Map<string, WorkspaceNavItem[]>()
		for (const item of nav) {
			const group = item.group ?? 'Workspace'
			result.set(group, [...(result.get(group) ?? []), item])
		}
		return Array.from(result.entries())
	}, [nav])
	const activeNavTo = useMemo(
		() => resolveActiveNavTo(activePath, nav),
		[activePath, nav]
	)
	const navBody = (
		<div className="space-y-6">
			{groups.map(([group, items]) => (
				<div key={group}>
					{!collapsed ? (
						<div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--tds-muted)]">
							{group}
						</div>
					) : (
						<div className="mb-2 h-px bg-white/30" />
					)}
					<div className="space-y-1">
						{items.map((item) => {
							const selected = item.to === activeNavTo
							return (
								<button
									key={`${item.to}-${item.label}`}
									type="button"
									onClick={() => {
										onNavigate(item.to)
										setMobileOpen(false)
									}}
									title={collapsed ? item.label : undefined}
									className={cn(
										'group flex min-h-[40px] w-full items-center gap-3 rounded-[14px] px-2.5 text-left text-sm font-semibold transition-all duration-200',
										collapsed ? 'justify-center' : '',
										selected
											? 'tds-sidebar-link-active text-white'
											: 'tds-sidebar-link text-[var(--tds-muted)] hover:text-[var(--tds-primary)]'
									)}
								>
									<span
										className={cn(
											'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition-all',
											selected
												? 'bg-white/20 text-white'
												: 'bg-white/50 text-current group-hover:bg-white'
										)}
									>
										{item.icon}
									</span>
									{!collapsed && (
										<span className="truncate">
											{item.label}
										</span>
									)}
								</button>
							)
						})}
					</div>
				</div>
			))}
		</div>
	)
	const userInitials =
		typeof userName === 'string'
			? userName
					.split(' ')
					.filter(Boolean)
					.slice(0, 2)
					.map((p) => (p[0] ?? '').toUpperCase())
					.join('')
			: '?'
	const userBlock = (
		<div
			className={cn(
				'mt-4 flex items-center gap-3 rounded-[16px] border border-white/55 bg-white/38 py-2.5',
				collapsed ? 'justify-center px-2' : 'px-3'
			)}
		>
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(38,132,91,0.18)] text-xs font-black text-[var(--tds-primary)] shadow-[0_2px_8px_rgba(38,132,91,0.15)]">
				{userInitials}
			</div>
			{!collapsed && (
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-bold text-[var(--tds-ink)]">
						{userName}
					</div>
					<div className="mt-0.5">{userRole}</div>
				</div>
			)}
			{!collapsed && toolbar && <div className="shrink-0">{toolbar}</div>}
		</div>
	)
	return (
		<div
			className={cn(
				'tds-shell relative min-h-screen overflow-hidden',
				className
			)}
		>
			<div className="tds-gradient-bg" />

			<aside
				className={cn(
					'tds-sidebar-shell fixed inset-y-0 left-0 z-30 hidden flex-col px-3 py-5 transition-all duration-300 xl:flex',
					collapsed ? 'w-[72px]' : 'w-[272px]'
				)}
			>
				<div
					className={cn(
						'mb-5 flex items-center gap-2',
						collapsed ? 'justify-center' : ''
					)}
				>
					{!collapsed && (
						<div className="tds-brand-zone min-w-0 flex-1 rounded-[18px] px-3 py-3">
							<div>{brand}</div>
							{subtitle ? (
								<div className="mt-2 border-t border-white/50 pt-2 text-[11px] font-medium leading-4 text-[var(--tds-muted)]">
									{subtitle}
								</div>
							) : null}
						</div>
					)}
					<button
						type="button"
						onClick={() => setCollapsed((v) => !v)}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/50 text-[var(--tds-muted)] transition hover:bg-white hover:text-[var(--tds-ink)]"
						aria-label="Toggle sidebar"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							className={cn(
								'transition-transform duration-300',
								collapsed ? 'rotate-180' : ''
							)}
						>
							<path
								d="M10 4L6 8l4 4"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>

				<div className="tds-sidebar-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
					{navBody}
				</div>

				{!collapsed && sidebarNote && (
					<div className="tds-studio-note mt-4 rounded-[18px] px-3 py-3 text-xs text-[var(--tds-muted)]">
						{sidebarNote}
					</div>
				)}

				{userBlock}
			</aside>

			<div
				className={cn(
					'relative z-20 transition-all duration-300',
					collapsed ? 'xl:pl-[72px]' : 'xl:pl-[272px]'
				)}
			>
				<header className="tds-topbar sticky top-0 z-30 px-4 py-3 lg:px-6">
					<div className="flex items-center justify-between gap-4">
						<div className="flex min-w-0 items-center gap-3">
							<button
								type="button"
								onClick={() => setMobileOpen(true)}
								className="tds-glass-control flex h-9 w-9 items-center justify-center rounded-[12px] xl:hidden"
								aria-label="Open menu"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
								>
									<path
										d="M2 4.5h14M2 9h14M2 13.5h14"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
									/>
								</svg>
							</button>
							<div className="min-w-0">
								<div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--tds-muted)]">
									TDS Studio
								</div>
								<div className="truncate text-sm font-bold text-[var(--tds-ink)]">
									{userName}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							{userRole}
							<div className="xl:hidden">{toolbar}</div>
						</div>
					</div>
				</header>
				<main className="tds-page h-[calc(100vh-57px)] overflow-y-auto px-4 py-6 lg:px-6">
					<div className="mx-auto max-w-[1540px]">{children}</div>
				</main>
			</div>

			<div
				className={cn(
					'fixed inset-0 z-40 bg-[rgba(23,32,51,0.38)] backdrop-blur-sm transition xl:hidden',
					mobileOpen
						? 'pointer-events-auto opacity-100'
						: 'pointer-events-none opacity-0'
				)}
			>
				<button
					type="button"
					className="absolute inset-0"
					onClick={() => setMobileOpen(false)}
					aria-label="Close menu"
				/>
				<div
					className={cn(
						'absolute bottom-0 left-0 top-0 flex w-[min(88vw,300px)] flex-col border-r border-white/70 bg-[rgba(246,248,251,0.96)] px-4 py-5 shadow-[20px_0_60px_rgba(23,32,51,0.22)] backdrop-blur-2xl transition-transform duration-300',
						mobileOpen ? 'translate-x-0' : '-translate-x-full'
					)}
				>
					<div className="mb-5 flex items-start justify-between gap-4">
						<div>
							<div className="text-base font-black text-[var(--tds-ink)]">
								{brand}
							</div>
							{subtitle ? (
								<div className="mt-1 text-xs text-[var(--tds-muted)]">
									{subtitle}
								</div>
							) : null}
						</div>
						<button
							type="button"
							onClick={() => setMobileOpen(false)}
							className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[var(--tds-muted)]"
							aria-label="Close"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
							>
								<path
									d="M1 1l10 10M11 1L1 11"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
						{navBody}
					</div>
					{userBlock}
				</div>
			</div>
		</div>
	)
}
