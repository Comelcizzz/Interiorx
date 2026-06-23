import { Button, Card, CardContent, Input, PageHeader } from '@tailored/ui'
import { FormEvent, useState } from 'react'
import { PublicHeader } from '@/components/PublicHeader'
import { publicApi } from '@/lib/api'

export function ContactPage() {
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [message, setMessage] = useState('')
	const [attachmentUrl, setAttachmentUrl] = useState('')
	const [status, setStatus] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	async function submit(e: FormEvent) {
		e.preventDefault()
		setError('')
		setStatus('')
		setLoading(true)
		try {
			await publicApi.post('/contact', {
				fullName: fullName.trim(),
				email: email.trim(),
				phone: phone.trim() || undefined,
				message: message.trim(),
				attachmentUrl: attachmentUrl.trim() || undefined,
			})
			setStatus('Дякуємо, ми отримали повідомлення і відповімо найближчим часом.')
			setMessage('')
			setAttachmentUrl('')
		} catch (err: unknown) {
			const maybe = err as {
				response?: {
					data?: {
						message?: string
					}
				}
			}
			setError(maybe.response?.data?.message ?? 'Не вдалося надіслати повідомлення')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
				<PageHeader
					title="Контакти"
					description="Опишіть простір, задачу і бажані терміни. Ми відповідаємо протягом робочого дня."
				/>
				<Card>
					<CardContent>
						<p className="text-sm text-slate-700">
							Лінія студії: +380 67 000 00 00 · hello@tailored.design
						</p>
						<p className="mt-2 text-sm text-slate-600">
							Графік: понеділок-пʼятниця, 09:00-18:00
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<form className="space-y-3" onSubmit={submit}>
							<Input
								required
								value={fullName}
								onChange={(ev) => setFullName(ev.target.value)}
								placeholder="Імʼя та прізвище"
							/>
							<Input
								required
								type="email"
								value={email}
								onChange={(ev) => setEmail(ev.target.value)}
								placeholder="Email"
							/>
							<Input
								value={phone}
								onChange={(ev) => setPhone(ev.target.value)}
								placeholder="Телефон (необовʼязково)"
							/>
							<label className="block text-xs font-semibold text-slate-600">
								Деталі проєкту
							</label>
							<textarea
								required
								minLength={10}
								value={message}
								onChange={(ev) => setMessage(ev.target.value)}
								placeholder="Локація, обсяг робіт, бажані терміни, бюджет..."
								className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
							/>
							<Input
								value={attachmentUrl}
								onChange={(ev) => setAttachmentUrl(ev.target.value)}
								placeholder="Посилання на референс або фото (необовʼязково)"
							/>
							{error ? <p className="text-sm text-rose-600">{error}</p> : null}
							{status ? <p className="text-sm text-emerald-700">{status}</p> : null}
							<Button type="submit" disabled={loading}>
								{loading ? 'Надсилаємо...' : 'Надіслати'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</main>
		</div>
	)
}
