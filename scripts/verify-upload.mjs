#!/usr/bin/env node
/**
 * Перевірка ланцюжка upload → photo-report → static file.
 * Запуск: node scripts/verify-upload.mjs
 * Потрібен працюючий backend на http://localhost:4000 (seed).
 */
const API = process.env.API_URL ?? 'http://localhost:4000/api'
const ORIGIN = API.replace(/\/api\/?$/i, '')

const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

function fail(msg) {
	console.error(`❌ ${msg}`)
	process.exit(1)
}

function ok(msg) {
	console.log(`✅ ${msg}`)
}

async function login(email) {
	const res = await fetch(`${API}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password: 'Demo12345!' }),
	})
	if (!res.ok) fail(`Login failed (${res.status}) for ${email}`)
	const data = await res.json()
	if (!data.accessToken) fail('Login response missing accessToken')
	return data.accessToken
}

async function uploadFile(token) {
	const form = new FormData()
	form.append(
		'file',
		new Blob([PNG], { type: 'image/png' }),
		'verify-upload.png',
	)
	const res = await fetch(`${API}/files/upload`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	})
	const text = await res.text()
	if (!res.ok) fail(`Upload failed (${res.status}): ${text}`)
	const data = JSON.parse(text)
	if (!data.id || !data.url) fail(`Upload response invalid: ${text}`)
	if (!data.url.startsWith('/uploads/')) fail(`Unexpected upload url: ${data.url}`)
	ok(`Upload OK → id=${data.id}, url=${data.url}`)
	return data
}

async function pickProjectId(token) {
	const res = await fetch(`${API}/projects?page=1&perPage=1`, {
		headers: { Authorization: `Bearer ${token}` },
	})
	if (!res.ok) fail(`List projects failed (${res.status})`)
	const data = await res.json()
	const id = data.items?.[0]?.id
	if (!id) fail('No projects in seed — run npm run seed')
	ok(`Using project ${id}`)
	return id
}

async function createPhotoReport(token, projectId, fileId) {
	const res = await fetch(`${API}/photo-reports`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			projectId,
			fileIds: [fileId],
			caption: 'verify-upload script',
			category: 'SITE',
		}),
	})
	const text = await res.text()
	if (!res.ok) fail(`Create photo-report failed (${res.status}): ${text}`)
	const data = JSON.parse(text)
	if (!data.photoUrls?.length) fail(`Photo report has no resolved urls: ${text}`)
	ok(`Photo report OK → ${data.photoUrls[0]}`)
	return data.photoUrls[0]
}

async function fetchStatic(urlPath) {
	const res = await fetch(`${ORIGIN}${urlPath}`)
	if (!res.ok) fail(`Static file not served (${res.status}): ${urlPath}`)
	const buf = Buffer.from(await res.arrayBuffer())
	if (buf.length < 10) fail(`Static file too small: ${urlPath}`)
	ok(`Static file served (${buf.length} bytes) at ${urlPath}`)
}

console.log('── Verify file upload flow ──')
const token = await login('designer@tailored.demo')
const uploaded = await uploadFile(token)
await fetchStatic(uploaded.url)
const projectId = await pickProjectId(token)
const publicUrl = await createPhotoReport(token, projectId, uploaded.id)
await fetchStatic(publicUrl)
console.log('\n✅ Upload flow verified end-to-end')
