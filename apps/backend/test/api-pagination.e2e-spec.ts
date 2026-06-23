import { RequestMethod, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'

const demoPassword = process.env.DEMO_PASSWORD ?? 'Demo12345!'

async function login(
	app: INestApplication,
	email: string
): Promise<string> {
	const res = await request(app.getHttpServer())
		.post('/api/auth/login')
		.send({ email, password: demoPassword })
		.expect((r) => {
			if (r.status !== 200 && r.status !== 201) {
				throw new Error(`Login failed: ${r.status}`)
			}
		})
	return res.body.accessToken as string
}

describe('API pagination & CRM (e2e)', () => {
	let app: INestApplication

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()
		app = moduleFixture.createNestApplication()
		app.setGlobalPrefix('api', {
			exclude: [{ path: 'health', method: RequestMethod.GET }],
		})
		app.useGlobalPipes(
			new ValidationPipe({ whitelist: true, transform: true })
		)
		await app.init()
	}, 60_000)

	afterAll(async () => {
		await app.close()
	})

	it('GET /health', async () => {
		await request(app.getHttpServer()).get('/health').expect(200)
	})

	it('GET /api/estimates returns paginated shape', async () => {
		const token = await login(app, 'manager@tailored.demo')
		const res = await request(app.getHttpServer())
			.get('/api/estimates?page=1&perPage=5')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
		expect(Array.isArray(res.body.items)).toBe(true)
		expect(typeof res.body.total).toBe('number')
	})

	it('GET /api/receipts returns paginated shape', async () => {
		const token = await login(app, 'accountant@tailored.demo')
		const res = await request(app.getHttpServer())
			.get('/api/receipts?page=1&perPage=5')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
		expect(Array.isArray(res.body.items)).toBe(true)
		expect(typeof res.body.total).toBe('number')
	})

	it('GET /api/crm/funnel allows designer', async () => {
		const token = await login(app, 'designer@tailored.demo')
		const res = await request(app.getHttpServer())
			.get('/api/crm/funnel')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
		expect(Array.isArray(res.body)).toBe(true)
	})

	it('GET /api/crm/stats returns aggregate', async () => {
		const token = await login(app, 'manager@tailored.demo')
		const res = await request(app.getHttpServer())
			.get('/api/crm/stats')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
		expect(typeof res.body.ordersCount).toBe('number')
		expect(res.body.pipelineBudget).toBeDefined()
	})

	it('PATCH /api/projects/:id/team as manager', async () => {
		const token = await login(app, 'manager@tailored.demo')
		const projects = await request(app.getHttpServer())
			.get('/api/projects?page=1&perPage=1')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)
		const projectId = projects.body.items?.[0]?.id
		if (!projectId) return
		await request(app.getHttpServer())
			.patch(`/api/projects/${projectId}/team`)
			.set('Authorization', `Bearer ${token}`)
			.send({ managerStaffId: null, designerStaffId: null })
			.expect(200)
	})
})
