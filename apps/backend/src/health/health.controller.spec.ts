import { HealthController } from './health.controller'
describe('HealthController', () => {
	it('returns service health payload', () => {
		const controller = new HealthController()
		const result = controller.getHealth()
		expect(result.status).toBe('ok')
		expect(result.service).toBe('tailored-design-solutions-api')
		expect(result.time).toBeDefined()
	})
})
