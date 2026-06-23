import { BadRequestException } from '@nestjs/common'
import { Types } from 'mongoose'
export function toObjectId(id: string, message = 'Invalid id'): Types.ObjectId {
	if (!Types.ObjectId.isValid(id)) {
		throw new BadRequestException(message)
	}
	return new Types.ObjectId(id)
}
export function optionalToObjectId(
	id: string | undefined,
	fieldName: string
): Types.ObjectId | undefined {
	if (id === undefined || id === '') return undefined
	return toObjectId(id, `Invalid ${fieldName}`)
}
