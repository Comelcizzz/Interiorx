import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from '../auth/auth.service'
import { RegisterClientDto } from '../auth/dto/register-client.dto'
import { PublicContactDto } from './dto/public-contact.dto'
import { PublicService } from './public.service'
@ApiTags('public')
@Controller()
export class PublicController {
	constructor(
		private readonly publicService: PublicService,
		private readonly authService: AuthService
	) {}
	@Get('catalog/services')
	catalogServices(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('q')
		q?: string,
		@Query('category')
		category?: string,
		@Query('style')
		style?: string,
		@Query('sort')
		sort?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string
	) {
		return this.publicService.catalogServices({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			q,
			category,
			style,
			sort,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
		})
	}
	@Get('catalog/services/:slug')
	catalogServiceBySlug(
		@Param('slug')
		slug: string
	) {
		return this.publicService.catalogServiceBySlug(slug)
	}
	@Get('portfolio')
	portfolioList(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('q')
		q?: string,
		@Query('category')
		category?: string,
		@Query('style')
		style?: string,
		@Query('sort')
		sort?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string
	) {
		return this.publicService.portfolioList({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			q,
			category,
			style,
			sort,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
		})
	}
	@Get('reviews')
	reviews(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('sort')
		sort?: string,
		@Query('minRating')
		minRating?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string
	) {
		return this.publicService.reviews({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			sort,
			minRating:
				minRating != null && minRating !== ''
					? Number(minRating)
					: undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
		})
	}
	@Get('portfolio/:slug')
	portfolioBySlug(
		@Param('slug')
		slug: string
	) {
		return this.publicService.portfolioBySlug(slug)
	}
	@Get('team')
	team() {
		return this.publicService.teamMembers()
	}
	@Get('verify/:number')
	verifyReceipt(
		@Param('number')
		number: string
	) {
		return this.publicService.verifyReceipt(number)
	}
	@Post('contact')
	submitContact(
		@Body()
		dto: PublicContactDto
	) {
		return this.publicService.submitContact(dto)
	}
	@Post('auth/register')
	registerClient(
		@Body()
		dto: RegisterClientDto
	) {
		return this.authService.registerClient(dto)
	}
}
