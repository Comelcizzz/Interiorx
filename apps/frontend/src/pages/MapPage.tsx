import {
	Badge,
	Button,
	Card,
	CardContent,
	ErrorState,
	Input,
	PageHeader,
} from '@tailored/ui'
import { projectStatusLabels } from '@tailored/shared'
import {
	CircleMarker,
	MapContainer,
	Popup,
	TileLayer,
	useMapEvents,
} from 'react-leaflet'
import { Search, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Map as LeafletMap } from 'leaflet'
import { getApi } from '@/lib/api'
import { ProjectMapMarker } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
const colorByStatus: Record<string, string> = {
	IN_PROGRESS: '#26845b',
	ESTIMATION: '#bd7b3a',
	PAUSED: '#f97316',
	COMPLETED: '#16a34a',
	DESIGN: '#2563eb',
	APPROVED: '#059669',
	DRAFT: '#94a3b8',
	CANCELLED: '#ef4444',
}
const toneByStatus: Record<
	string,
	'neutral' | 'green' | 'amber' | 'blue' | 'red'
> = {
	IN_PROGRESS: 'green',
	ESTIMATION: 'amber',
	PAUSED: 'amber',
	COMPLETED: 'green',
	DESIGN: 'blue',
	APPROVED: 'green',
	DRAFT: 'neutral',
	CANCELLED: 'red',
}
const ALL_STATUSES = Object.keys(colorByStatus)
type NominatimResult = {
	place_id: number
	display_name: string
	lat: string
	lon: string
}
type PendingPin = {
	lat: number
	lng: number
}
function ClickHandler({ onAdd }: { onAdd: (pin: PendingPin) => void }) {
	useMapEvents({
		click(e) {
			onAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
		},
	})
	return null
}
export function MapPage() {
	const { data, loading, error } = useLoad(
		() => getApi<ProjectMapMarker[]>('/projects/map'),
		[]
	)
	const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
		new Set(ALL_STATUSES)
	)
	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
	const [searching, setSearching] = useState(false)
	const [addMode, setAddMode] = useState(false)
	const [pending, setPending] = useState<PendingPin | null>(null)
	const [newAddress, setNewAddress] = useState('')
	const mapRef = useRef<LeafletMap | null>(null)
	const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const toggleStatus = (s: string) => {
		setActiveStatuses((prev) => {
			const next = new Set(prev)
			if (next.has(s)) next.delete(s)
			else next.add(s)
			return next
		})
	}
	const handleSearch = useCallback((q: string) => {
		setSearchQuery(q)
		if (searchTimer.current) clearTimeout(searchTimer.current)
		if (!q.trim()) {
			setSearchResults([])
			return
		}
		searchTimer.current = setTimeout(async () => {
			setSearching(true)
			try {
				const resp = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
					{ headers: { 'Accept-Language': 'uk,en' } }
				)
				setSearchResults(await resp.json())
			} catch {
			} finally {
				setSearching(false)
			}
		}, 600)
	}, [])
	const flyToResult = (r: NominatimResult) => {
		setSearchQuery(r.display_name)
		setSearchResults([])
		mapRef.current?.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 14, {
			duration: 1.2,
		})
	}
	const filtered = (data ?? []).filter(
		(m) => m.lat && m.lng && activeStatuses.has(m.status)
	)
	if (loading && !data) {
		return (
			<div className="space-y-4">
				<PageHeader
					title="Карта проєктів"
					description="Завантажуємо дані карти…"
				/>
				<div className="h-[min(70vh,560px)] animate-pulse rounded-[20px] bg-white/30" />
			</div>
		)
	}
	if (error) {
		return (
			<div className="space-y-4">
				<PageHeader title="Карта проєктів" />
				<ErrorState message={error} />
			</div>
		)
	}
	return (
		<div className="space-y-4">
			<PageHeader
				title="Карта проєктів"
				description={`${filtered.length} активних маркерів · ${data?.length ?? 0} проєктів усього`}
				actions={
					<Button
						variant={addMode ? 'danger' : 'secondary'}
						onClick={() => {
							setAddMode((v) => !v)
							setPending(null)
						}}
					>
						{addMode ? (
							<>
								<X className="h-4 w-4" /> Cancel
							</>
						) : (
							'+ Pin location'
						)}
					</Button>
				}
			/>

			<div className="grid gap-4 xl:grid-cols-[240px_1fr]">
				<div className="space-y-3">
					<Card>
						<CardContent className="py-3">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tds-muted)]" />
								<Input
									value={searchQuery}
									onChange={(e) =>
										handleSearch(e.target.value)
									}
									placeholder="Search address..."
									className="pl-9"
								/>
								{searching && (
									<div className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--tds-primary)] border-t-transparent" />
								)}
							</div>
							{searchResults.length > 0 && (
								<div className="mt-2 space-y-1">
									{searchResults.map((r) => (
										<button
											key={r.place_id}
											onClick={() => flyToResult(r)}
											className="w-full rounded-[10px] border border-white/60 bg-white/50 px-3 py-2 text-left text-xs text-[var(--tds-ink)] hover:bg-white"
										>
											{r.display_name.slice(0, 60)}...
										</button>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardContent className="py-3">
							<div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--tds-muted)]">
								Filter by status
							</div>
							<div className="space-y-1.5">
								{ALL_STATUSES.map((s) => {
									const count = (data ?? []).filter(
										(m) => m.status === s && m.lat && m.lng
									).length
									if (!count) return null
									const active = activeStatuses.has(s)
									return (
										<button
											key={s}
											onClick={() => toggleStatus(s)}
											className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-xs transition ${active ? 'bg-white/60' : 'opacity-40'}`}
										>
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full"
												style={{
													background:
														colorByStatus[s],
												}}
											/>
											<span className="flex-1 font-medium text-[var(--tds-ink)]">
												{projectStatusLabels[
													s as keyof typeof projectStatusLabels
												] ?? s}
											</span>
											<Badge
												tone={
													toneByStatus[s] ?? 'neutral'
												}
											>
												{count}
											</Badge>
										</button>
									)
								})}
							</div>
						</CardContent>
					</Card>

					{addMode && pending && (
						<Card>
							<CardContent className="py-3">
								<div className="mb-2 text-xs font-bold text-[var(--tds-ink)]">
									New pin at {pending.lat.toFixed(4)},{' '}
									{pending.lng.toFixed(4)}
								</div>
								<Input
									value={newAddress}
									onChange={(e) =>
										setNewAddress(e.target.value)
									}
									placeholder="Address label"
									className="mb-2"
								/>
								<Button
									className="w-full text-xs"
									onClick={() => {
										setPending(null)
										setAddMode(false)
									}}
								>
									Save pin (demo)
								</Button>
							</CardContent>
						</Card>
					)}
				</div>

				<div
					className="overflow-hidden rounded-[20px] border border-white/60 shadow-[10px_20px_40px_rgba(76,76,76,0.13)]"
					style={{ minHeight: 520 }}
				>
					{loading ? (
						<div className="flex h-full min-h-[520px] items-center justify-center bg-[rgba(236,239,237,0.6)]">
							<div className="animate-spin h-9 w-9 rounded-full border-[3px] border-[var(--tds-primary)] border-t-transparent" />
						</div>
					) : (
						<MapContainer
							center={[49.5, 31.2]}
							zoom={6}
							style={{
								height: '100%',
								minHeight: 520,
								width: '100%',
							}}
							ref={mapRef}
						>
							<TileLayer
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
							/>
							{addMode && (
								<ClickHandler
									onAdd={(pin) => {
										setPending(pin)
										setNewAddress('')
									}}
								/>
							)}
							{pending && (
								<CircleMarker
									center={[pending.lat, pending.lng]}
									radius={10}
									pathOptions={{
										color: '#b7794c',
										fillColor: '#b7794c',
										fillOpacity: 0.7,
									}}
								>
									<Popup>
										<strong>New location</strong>
										<br />
										{newAddress || 'Unnamed'}
									</Popup>
								</CircleMarker>
							)}
							{filtered.map((marker) => (
								<CircleMarker
									key={marker.id}
									center={[marker.lat!, marker.lng!]}
									radius={9}
									pathOptions={{
										color:
											colorByStatus[marker.status] ??
											'#94a3b8',
										fillColor:
											colorByStatus[marker.status] ??
											'#94a3b8',
										fillOpacity: 0.85,
										weight: 2,
									}}
								>
									<Popup>
										<div style={{ minWidth: 180 }}>
											<div
												style={{
													fontWeight: 900,
													marginBottom: 4,
												}}
											>
												{marker.title}
											</div>
											<div
												style={{
													fontSize: 12,
													color: '#747b87',
												}}
											>
												{marker.city ?? ''}{' '}
												{marker.address
													? `· ${marker.address}`
													: ''}
											</div>
											<div
												style={{
													marginTop: 6,
													fontSize: 12,
												}}
											>
												<span
													style={{
														background:
															colorByStatus[
																marker.status
															],
														color: '#fff',
														borderRadius: 99,
														padding: '2px 8px',
														fontSize: 11,
													}}
												>
													{projectStatusLabels[
														marker.status as keyof typeof projectStatusLabels
													] ?? marker.status}
												</span>
											</div>
										</div>
									</Popup>
								</CircleMarker>
							))}
						</MapContainer>
					)}
				</div>
			</div>
		</div>
	)
}
