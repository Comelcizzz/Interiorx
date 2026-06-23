import { Button, Card, CardContent, Input } from '@tailored/ui'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import type { AuthUser } from '@/lib/types'
import { useAuthStore } from '@/lib/auth-store'

export function AccountProfileForm() {
	const setSession = useAuthStore((s) => s.setSession)
	const token = useAuthStore((s) => s.token)
	const [profile, setProfile] = useState<AuthUser | null>(null)
	const [loadErr, setLoadErr] = useState<string | null>(null)
	const [fullName, setFullName] = useState('')
	const [phone, setPhone] = useState('')
	const [savingProfile, setSavingProfile] = useState(false)
	const [profileMsg, setProfileMsg] = useState<string | null>(null)
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [pwdBusy, setPwdBusy] = useState(false)
	const [pwdErr, setPwdErr] = useState<string | null>(null)
	const [pwdOk, setPwdOk] = useState(false)

	useEffect(() => {
		let alive = true
		setLoadErr(null)
		api.get<AuthUser>('/auth/me')
			.then((r) => {
				if (!alive) return
				setProfile(r.data)
				setFullName(r.data.fullName)
				setPhone(r.data.phone ?? '')
				const t = useAuthStore.getState().token
				if (t) useAuthStore.getState().setSession(t, r.data)
			})
			.catch(() => {
				if (alive) setLoadErr('Не вдалося завантажити профіль.')
			})
		return () => {
			alive = false
		}
	}, [])

	async function saveProfile(e: FormEvent) {
		e.preventDefault()
		setProfileMsg(null)
		setSavingProfile(true)
		try {
			const { data } = await api.patch<AuthUser>('/auth/me', {
				fullName: fullName.trim(),
				phone: phone.trim() || undefined,
			})
			setProfile(data)
			if (token) setSession(token, data)
			setProfileMsg('Зміни збережено.')
		} catch (err: unknown) {
			const msg = (
				err as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setProfileMsg(msg ?? 'Не вдалося зберегти зміни.')
		} finally {
			setSavingProfile(false)
		}
	}

	async function changePassword(e: FormEvent) {
		e.preventDefault()
		setPwdErr(null)
		setPwdOk(false)
		setPwdBusy(true)
		try {
			await api.patch('/auth/me/password', {
				currentPassword,
				newPassword,
			})
			setPwdOk(true)
			setCurrentPassword('')
			setNewPassword('')
		} catch (err: unknown) {
			const msg = (
				err as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setPwdErr(msg ?? 'Не вдалося оновити пароль.')
		} finally {
			setPwdBusy(false)
		}
	}

	return (
		<>
			{loadErr ? (
				<p className="text-sm text-rose-600">{loadErr}</p>
			) : null}

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Контакти
					</div>
					<form
						className="space-y-3"
						onSubmit={(e) => void saveProfile(e)}
					>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Повне імʼя
							</label>
							<Input
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								required
								minLength={2}
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Телефон
							</label>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Email
							</label>
							<Input
								value={profile?.email ?? ''}
								readOnly
								className="bg-slate-50"
							/>
						</div>
						{profileMsg ? (
							<p className="text-sm text-slate-600">
								{profileMsg}
							</p>
						) : null}
						<Button type="submit" disabled={savingProfile}>
							{savingProfile ? 'Зберігаємо...' : 'Зберегти'}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Пароль
					</div>
					{pwdOk ? (
						<p className="text-sm text-emerald-700">
							Пароль оновлено.
						</p>
					) : null}
					{pwdErr ? (
						<p className="text-sm text-rose-600">{pwdErr}</p>
					) : null}
					<form
						className="space-y-3"
						onSubmit={(e) => void changePassword(e)}
					>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Поточний пароль
							</label>
							<Input
								type="password"
								value={currentPassword}
								onChange={(e) =>
									setCurrentPassword(e.target.value)
								}
								required
								autoComplete="current-password"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Новий пароль
							</label>
							<Input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								minLength={8}
								autoComplete="new-password"
							/>
						</div>
						<Button type="submit" disabled={pwdBusy}>
							{pwdBusy ? 'Оновлюємо...' : 'Оновити пароль'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</>
	)
}
