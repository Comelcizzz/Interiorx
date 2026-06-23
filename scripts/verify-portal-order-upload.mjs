#!/usr/bin/env node
/** Portal new order with uploaded reference photo. */
const API = process.env.API_URL ?? 'http://localhost:4000/api'
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

async function login(email) {
	const res = await fetch(`${API}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password: 'Demo12345!' }),
	})
	if (!res.ok) throw new Error(`Login failed ${res.status}`)
	const data = await res.json()
	return data.accessToken
}

async function main() {
	console.log('── Verify portal order reference upload ──')
	const token = await login('client@tailored.demo')
	const form = new FormData()
	form.append(
		'file',
		new Blob([PNG], { type: 'image/png' }),
		'portal-ref.png',
	)
	const uploadRes = await fetch(`${API}/files/upload`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	})
	if (!uploadRes.ok) throw new Error(`Upload failed ${uploadRes.status}`)
	const uploaded = await uploadRes.json()
	console.log('✅ Upload', uploaded.url)

	const servicesRes = await fetch(`${API}/public/catalog/services?page=1&perPage=1`)
	const services = await servicesRes.json()
	const slug = services.items?.[0]?.slug
	if (!slug) throw new Error('No catalog service')

	const orderRes = await fetch(`${API}/portal/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			serviceSlug: slug,
			title: 'Тест upload референсів',
			description: 'Автоматична перевірка завантаження референс-фото.',
			addressLine: 'вул. Тестова, 1',
			city: 'Київ',
			phone: '0671234598',
			referencePhotoUrls: [uploaded.url],
		}),
	})
	const text = await orderRes.text()
	if (!orderRes.ok) throw new Error(`Create order failed ${orderRes.status}: ${text}`)
	const order = JSON.parse(text)
	console.log('✅ Order created', order.code)

	const detailRes = await fetch(`${API}/portal/orders/${order.code}`, {
		headers: { Authorization: `Bearer ${token}` },
	})
	const detail = await detailRes.json()
	if (!(detail.referencePhotoUrls ?? []).includes(uploaded.url)) {
		throw new Error('Reference photo not stored on order')
	}
	console.log('✅ Reference photo stored on order')
}

main().catch((err) => {
	console.error('❌', err.message)
	process.exit(1)
})
