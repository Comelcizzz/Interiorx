import { Module } from '@nestjs/common'
import { FilesModule } from '../files/files.module'
import {
	PhotoReportsController,
	ProjectPhotoReportsController,
} from './photo-reports.controller'
import { PhotoReportsService } from './photo-reports.service'
@Module({
	imports: [FilesModule],
	controllers: [PhotoReportsController, ProjectPhotoReportsController],
	providers: [PhotoReportsService],
	exports: [PhotoReportsService],
})
export class PhotoReportsModule {}
