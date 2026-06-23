import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { RouterModule } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { SeedOnStartService } from './bootstrap/seed-on-start.service'
import { HealthModule } from './health/health.module'
import { MongoModule } from './mongo/mongo.module'
import { PortalModule } from './portal/portal.module'
import { PublicModule } from './public/public.module'
import { WorkspaceShellModule } from './workspace/workspace-shell.module'
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		JwtModule.register({ global: true }),
		MongoModule,
		HealthModule,
		AuthModule,
		WorkspaceShellModule,
		PublicModule,
		PortalModule,
		RouterModule.register([
			{ path: 'public', module: PublicModule },
			{ path: 'portal', module: PortalModule },
		]),
	],
	providers: [SeedOnStartService],
})
export class AppModule {}
