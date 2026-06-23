import {
	Body,
	Controller,
	Get,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { LoginDto } from './dto/login.dto'
import { PatchAvatarDto } from './dto/patch-avatar.dto'
import { PatchMeDto } from './dto/patch-me.dto'
import { PatchPasswordDto } from './dto/patch-password.dto'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { AuthenticatedRequest } from './request-user'
@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}
	@Post('login')
	login(
		@Body()
		dto: LoginDto
	) {
		return this.authService.login(dto)
	}
	@Get('me')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	me(
		@Req()
		request: AuthenticatedRequest
	) {
		return this.authService.getPublicProfile(request.user.id)
	}
	@Patch('me')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	patchMe(
		@Req()
		request: AuthenticatedRequest,
		@Body()
		dto: PatchMeDto
	) {
		return this.authService.updateMe(request.user.id, dto)
	}
	@Patch('me/avatar')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	patchAvatar(
		@Req()
		request: AuthenticatedRequest,
		@Body()
		dto: PatchAvatarDto
	) {
		return this.authService.updateAvatar(request.user.id, dto)
	}
	@Patch('me/password')
	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	patchPassword(
		@Req()
		request: AuthenticatedRequest,
		@Body()
		dto: PatchPasswordDto
	) {
		return this.authService.updatePassword(request.user.id, dto)
	}
}
