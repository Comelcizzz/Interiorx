import { RequestMethod, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { isAbsolute, join } from 'path'
import { AppModule } from './app.module'
import { SeedOnStartService } from './bootstrap/seed-on-start.service'
import { setupUploadsHandler } from './files/uploads-handler'
import { isAllowedCorsOrigin, parseCorsOrigins } from './lib/cors-origins'
async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule)
	const config = app.get(ConfigService)
	const nodeEnv = process.env.NODE_ENV ?? 'development'
	const jwtSecret = config.get<string>('JWT_ACCESS_SECRET')
	if (nodeEnv === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
		throw new Error(
			'JWT_ACCESS_SECRET must be set to a strong value (min 32 chars) when NODE_ENV=production'
		)
	}
	const frontendUrl =
		config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
	const allowedOrigins = parseCorsOrigins(frontendUrl)
	if (allowedOrigins.length === 0) {
		allowedOrigins.push('http://localhost:3000')
	}
	app.setGlobalPrefix('api', {
		exclude: [{ path: 'health', method: RequestMethod.GET }],
	})
	const configuredUploadDir = config.get<string>('UPLOAD_DIR')
	const uploadDir = configuredUploadDir
		? isAbsolute(configuredUploadDir)
			? configuredUploadDir
			: join(process.cwd(), configuredUploadDir)
		: join(process.cwd(), 'uploads')
	app.enableCors({
		origin: (origin, callback) => {
			callback(
				null,
				isAllowedCorsOrigin(origin, allowedOrigins, nodeEnv)
			)
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
	})
	await app.init()
	setupUploadsHandler(app)
	app.useStaticAssets(uploadDir, { prefix: '/uploads/' })
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		})
	)
	const swaggerConfig = new DocumentBuilder()
		.setTitle('INTERIORIX API')
		.setDescription('Business platform API for INTERIORIX interior design projects')
		.setVersion('0.1.0')
		.addBearerAuth()
		.build()
	const document = SwaggerModule.createDocument(app, swaggerConfig)
	SwaggerModule.setup('api/docs', app, document)
	await app.listen(config.get<number>('BACKEND_PORT') ?? 4000)
	if (nodeEnv === 'production') {
		const seedOnStart = app.get(SeedOnStartService)
		void seedOnStart.runAfterListen()
	}
}
void bootstrap()
