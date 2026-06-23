import { ensureDemoMarketingImages, uploadRootPath } from './demo-assets'
import * as fs from 'fs'

fs.mkdirSync(uploadRootPath(), { recursive: true })
ensureDemoMarketingImages()
console.log('Demo upload assets ready.')
