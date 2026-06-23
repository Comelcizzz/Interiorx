import { Button, Card, CardContent, Input, PageHeader } from '@tailored/ui'
import { formatNumber, receiptStatusLabels } from '@tailored/shared'
import { FormEvent, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '@/lib/api'
type ReceiptVerify = {
	number: string
	status: string
	amount: string
	currency: string
	issuedAt: string
	projectCode: string | null
}
export function VerifyReceiptPage() {
	const { number = '' } = useParams()
	const [code, setCode] = useState(number)
	const [data, setData] = useState<ReceiptVerify | null>(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	async function submit(event: FormEvent) {
		event.preventDefault()
		if (!code.trim()) return
		setLoading(true)
		setError('')
		try {
			const response = await publicApi.get<ReceiptVerify>(
				`/verify/${encodeURIComponent(code.trim())}`
			)
			setData(response.data)
		} catch {
			setData(null)
			setError('Чек не знайдено або він недоступний.')
		} finally {
			setLoading(false)
		}
	}
	return (
		<div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
			<PageHeader
				title="Перевірка чека"
				description="Публічна перевірка справжності виданого чека."
			/>
			<form className="flex gap-2" onSubmit={submit}>
				<Input
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="Введіть номер чека"
				/>
				<Button type="submit" disabled={loading}>
					{loading ? 'Перевіряємо...' : 'Перевірити'}
				</Button>
			</form>
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}
			{data ? (
				<Card>
					<CardContent>
						<p className="text-sm">
							Номер:{' '}
							<span className="font-semibold">{data.number}</span>
						</p>
						<p className="text-sm">
							Статус:{' '}
							{receiptStatusLabels[data.status] ?? data.status}
						</p>
						<p className="text-sm">
							Сума: {formatNumber(data.amount)} {data.currency}
						</p>
						<p className="text-sm">
							Код проєкту: {data.projectCode ?? '—'}
						</p>
					</CardContent>
				</Card>
			) : null}
		</div>
	)
}
