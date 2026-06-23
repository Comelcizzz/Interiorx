import { RequestMethod, ValidationPipe } from '@nestjs/common'
import { INestApplication } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { join } from 'path'
import request from 'supertest'
import { AppModule } from '../src/app.module'

const demoPassword = process.env.DEMO_PASSWORD ?? 'Demo12345!'

const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

async function login(
	app: INestApplication,
	email: string,
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

describe('File upload flow (e2e)', () => {
	let app: INestApplication

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()
		app = moduleFixture.createNestApplication<NestExpressApplication>()
		app.setGlobalPrefix('api', {
			exclude: [{ path: 'health', method: RequestMethod.GET }],
		})
		const uploadDir = join(process.cwd(), 'uploads')
		app.useStaticAssets(uploadDir, { prefix: '/uploads/' })
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
				forbidNonWhitelisted: true,
			}),
		)
		await app.init()
	}, 60_000)

	afterAll(async () => {
		await app.close()
	})

	it('uploads file and creates photo report with fileIds', async () => {
		const token = await login(app, 'designer@tailored.demo')

		const uploadRes = await request(app.getHttpServer())
			.post('/api/files/upload')
			.set('Authorization', `Bearer ${token}`)
			.attach('file', PNG, 'verify-upload.png')
			.expect((r) => {
				if (r.status !== 200 && r.status !== 201) {
					throw new Error(`Upload failed: ${r.status}`)
				}
			})

		expect(uploadRes.body.id).toBeTruthy()
		expect(uploadRes.body.url).toMatch(/^\/uploads\//)

		await request(app.getHttpServer())
			.get(uploadRes.body.url)
			.expect(200)

		const projectsRes = await request(app.getHttpServer())
			.get('/api/projects?page=1&perPage=1')
			.set('Authorization', `Bearer ${token}`)
			.expect(200)

		const projectId = projectsRes.body.items?.[0]?.id
		expect(projectId).toBeTruthy()

		const reportRes = await request(app.getHttpServer())
			.post('/api/photo-reports')
			.set('Authorization', `Bearer ${token}`)
			.send({
				projectId,
				fileIds: [uploadRes.body.id],
				caption: 'e2e upload test',
				category: 'SITE',
			})
			.expect((r) => {
				if (r.status !== 200 && r.status !== 201) {
					throw new Error(`Photo report failed: ${r.status}`)
				}
			})

		expect(Array.isArray(reportRes.body.photoUrls)).toBe(true)
		expect(reportRes.body.photoUrls.length).toBeGreaterThan(0)
		expect(reportRes.body.photoUrls[0]).toMatch(/^\/uploads\//)
	})
})
