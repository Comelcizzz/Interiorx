import { Type } from 'class-transformer'
import {
	ArrayMaxSize,
	IsArray,
	IsDateString,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator'
import { IsAfterToday } from '../../common/validators/is-after-today.decorator'
import { IsReferencePhotoUrl } from '../../common/validators/is-reference-photo-url.decorator'
import { IsRequestedBudget } from '../../common/validators/is-requested-budget.decorator'
import { IsContactPhone } from '../../common/validators/is-contact-phone.decorator'

export class PortalCreateOrderDto {
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	serviceSlug!: string

	@IsString()
	@MinLength(3)
	@MaxLength(160)
	title!: string

	@IsString()
	@MinLength(5)
	@MaxLength(4000)
	description!: string

	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	style?: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	@IsRequestedBudget()
	requestedBudget?: string

	@IsOptional()
	@IsDateString()
	@IsAfterToday({
		message:
			'Бажаний старт не може бути сьогодні чи в минулому — оберіть дату з завтра',
	})
	preferredStart?: string

	@IsString()
	@MinLength(3)
	@MaxLength(200)
	addressLine!: string

	@IsString()
	@MinLength(2)
	@MaxLength(80)
	city!: string

	@IsString()
	@IsContactPhone()
	phone!: string

	@IsOptional()
	@IsArray()
	@ArrayMaxSize(12)
	@Type(() => String)
	@IsReferencePhotoUrl({
		message:
			'Кожне референс-фото має бути посиланням https://… або завантаженим файлом',
	})
	referencePhotoUrls?: string[]

	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	portfolioReferenceSlug?: string
}
