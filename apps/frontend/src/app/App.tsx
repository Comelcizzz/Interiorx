import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from 'react-router-dom'
import { Shell } from './Shell'
import { PortalShell } from './PortalShell'
import {
	PortalRoleGuard,
	RequireWorkspaceRoles,
	WorkspaceRoleGuard,
} from './guards'
import { useAuthStore } from '@/lib/auth-store'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AuditLogPage } from '@/pages/AuditLogPage'
import { ContactPage } from '@/pages/ContactPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { BrigadirWorkbenchPage } from '@/pages/BrigadirWorkbenchPage'
import { DesignerWorkbenchPage } from '@/pages/DesignerWorkbenchPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { EstimatesPage } from '@/pages/EstimatesPage'
import { LoginPortalPage } from '@/pages/LoginPortalPage'
import { MarketingPublicHomePage } from '@/pages/MarketingPublicHomePage'
import { MeasurementsPage } from '@/pages/MeasurementsPage'
import { PaymentCheckoutPage } from '@/pages/PaymentCheckoutPage'
import { PaymentMockPage } from '@/pages/PaymentMockPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { PortfolioDetailPage } from '@/pages/PortfolioDetailPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { PortalClientReviewsPage } from '@/pages/PortalClientReviewsPage'
import { PortalDashboardPage } from '@/pages/PortalDashboardPage'
import { PortalInvoicesPage } from '@/pages/PortalInvoicesPage'
import { PortalNewOrderPage } from '@/pages/PortalNewOrderPage'
import { PortalNotificationsPage } from '@/pages/PortalNotificationsPage'
import { PortalOrderDetailPage } from '@/pages/PortalOrderDetailPage'
import { PortalOrdersPage } from '@/pages/PortalOrdersPage'
import { PortalProfilePage } from '@/pages/PortalProfilePage'
import { PortalProjectDetailPage } from '@/pages/PortalProjectDetailPage'
import { PortalProjectsPage } from '@/pages/PortalProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ReceiptsPage } from '@/pages/ReceiptsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ReviewsPage } from '@/pages/ReviewsPage'
import { ServiceDetailPage } from '@/pages/ServiceDetailPage'
import { ServicesPublicPage } from '@/pages/ServicesPublicPage'
import { TeamPage } from '@/pages/TeamPage'
import { UsersPage } from '@/pages/UsersPage'
import { WorkspaceCatalogServicesPage } from '@/pages/WorkspaceCatalogServicesPage'
import { WorkspaceNotificationsPage } from '@/pages/WorkspaceNotificationsPage'
import { WorkspaceOrderDetailPage } from '@/pages/WorkspaceOrderDetailPage'
import { WorkspaceOrdersPage } from '@/pages/WorkspaceOrdersPage'
import { WorkspacePortfolioEditorPage } from '@/pages/WorkspacePortfolioEditorPage'
import { WorkspaceProfilePage } from '@/pages/WorkspaceProfilePage'
import { WorkspaceReviewsModerationPage } from '@/pages/WorkspaceReviewsModerationPage'
import { VerifyReceiptPage } from '@/pages/VerifyReceiptPage'
function WorkspaceIndexRedirect() {
	const user = useAuthStore((state) => state.user)
	const role = user?.role
	const target =
		role === 'DESIGNER'
			? 'my-work'
			: role === 'BRIGADIR'
				? 'my-work'
				: role === 'PROJECT_MANAGER'
					? 'orders'
					: 'dashboard'
	return <Navigate to={target} replace />
}
function Protected({ children }: { children: JSX.Element }) {
	const token = useAuthStore((state) => state.token)
	const location = useLocation()
	if (!token) {
		const path = `${location.pathname}${location.search}`
		const qs =
			path && path !== '/' ? `?next=${encodeURIComponent(path)}` : ''
		return <Navigate to={`/login${qs}`} replace />
	}
	return children
}
function WorkbenchRouter() {
	const role = useAuthStore((s) => s.user?.role)
	if (role === 'BRIGADIR') return <BrigadirWorkbenchPage />
	return <DesignerWorkbenchPage />
}
export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<MarketingPublicHomePage />} />
				<Route path="/services" element={<ServicesPublicPage />} />
				<Route path="/services/:slug" element={<ServiceDetailPage />} />
				<Route path="/portfolio" element={<PortfolioPage />} />
				<Route
					path="/portfolio/:slug"
					element={<PortfolioDetailPage />}
				/>
				<Route path="/reviews" element={<ReviewsPage />} />
				<Route path="/team" element={<TeamPage />} />
				<Route path="/contact" element={<ContactPage />} />
				<Route path="/verify/:number" element={<VerifyReceiptPage />} />
				<Route path="/login" element={<LoginPortalPage />} />
				<Route path="/register" element={<RegisterPage />} />

				<Route
					path="/portal"
					element={
						<Protected>
							<PortalRoleGuard>
								<PortalShell />
							</PortalRoleGuard>
						</Protected>
					}
				>
					<Route
						index
						element={<WorkspaceIndexRedirect />}
					/>
					<Route path="dashboard" element={<PortalDashboardPage />} />
					<Route path="orders" element={<PortalOrdersPage />} />
					<Route path="orders/new" element={<PortalNewOrderPage />} />
					<Route
						path="orders/:code"
						element={<PortalOrderDetailPage />}
					/>
					<Route path="projects" element={<PortalProjectsPage />} />
					<Route
						path="projects/:code"
						element={<PortalProjectDetailPage />}
					/>
					<Route path="invoices" element={<PortalInvoicesPage />} />
					<Route
						path="invoices/pay"
						element={
							<PaymentMockPage invoiceCheckout checkoutMode />
						}
					/>
					<Route
						path="pay"
						element={<Navigate to="/portal/invoices" replace />}
					/>
					<Route path="receipts" element={<ReceiptsPage />} />
					<Route
						path="reviews"
						element={<PortalClientReviewsPage />}
					/>
					<Route
						path="notifications"
						element={<PortalNotificationsPage />}
					/>
					<Route path="profile" element={<PortalProfilePage />} />
					<Route
						path="payment-checkout"
						element={<PaymentMockPage checkoutMode usePortalProjects />}
					/>
				</Route>

				<Route
					path="/workspace"
					element={
						<Protected>
							<WorkspaceRoleGuard>
								<Shell />
							</WorkspaceRoleGuard>
						</Protected>
					}
				>
					<Route index element={<WorkspaceIndexRedirect />} />
					<Route
						path="dashboard"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<DashboardPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="my-work"
						element={
							<RequireWorkspaceRoles
								roles={['DESIGNER', 'ADMIN', 'PROJECT_MANAGER', 'BRIGADIR']}
							>
								<WorkbenchRouter />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="notifications"
						element={<WorkspaceNotificationsPage />}
					/>
					<Route
						path="projects"
						element={
							<RequireWorkspaceRoles
								roles={[
									'ADMIN',
									'PROJECT_MANAGER',
									'DESIGNER',
									'BRIGADIR',
								]}
							>
								<ProjectsPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="projects/:id"
						element={
							<RequireWorkspaceRoles
								roles={[
									'ADMIN',
									'PROJECT_MANAGER',
									'DESIGNER',
									'BRIGADIR',
								]}
							>
								<ProjectDetailPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="map"
						element={<Navigate to="/workspace/dashboard" replace />}
					/>
					<Route
						path="calendar"
						element={<Navigate to="/workspace/dashboard" replace />}
					/>
					<Route
						path="kanban"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR']}
							>
								<KanbanPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="operations"
						element={<Navigate to="/workspace/dashboard" replace />}
					/>
					<Route
						path="materials/*"
						element={<Navigate to="/workspace/projects" replace />}
					/>
					<Route
						path="crm"
						element={<Navigate to="/workspace/orders" replace />}
					/>
					<Route
						path="services"
						element={
							<RequireWorkspaceRoles roles={['ADMIN', 'DESIGNER']}>
								<WorkspaceCatalogServicesPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="portfolio"
						element={
							<RequireWorkspaceRoles roles={['ADMIN', 'DESIGNER']}>
								<WorkspacePortfolioEditorPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="orders"
						element={
							<RequireWorkspaceRoles
								roles={[
									'ADMIN',
									'PROJECT_MANAGER',
									'DESIGNER',
								]}
							>
								<WorkspaceOrdersPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="orders/:code"
						element={
							<RequireWorkspaceRoles
								roles={[
									'ADMIN',
									'PROJECT_MANAGER',
									'DESIGNER',
								]}
							>
								<WorkspaceOrderDetailPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="payments"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<PaymentsPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route path="pay" element={<Navigate to="/workspace/payments" replace />} />
					<Route
						path="payment-checkout"
						element={<PaymentCheckoutPage />}
					/>
					<Route
						path="receipts"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<ReceiptsPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route path="reports" element={<Navigate to="/workspace/analytics" replace />} />
					<Route
						path="analytics"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<AnalyticsPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="users"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<UsersPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route path="profile" element={<WorkspaceProfilePage />} />
					<Route
						path="estimates"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<EstimatesPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="measurements"
						element={
							<RequireWorkspaceRoles
								roles={[
									'ADMIN',
									'PROJECT_MANAGER',
									'DESIGNER',
								]}
							>
								<MeasurementsPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="audit"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<AuditLogPage />
							</RequireWorkspaceRoles>
						}
					/>
					<Route
						path="reviews"
						element={
							<RequireWorkspaceRoles
								roles={['ADMIN', 'PROJECT_MANAGER']}
							>
								<WorkspaceReviewsModerationPage />
							</RequireWorkspaceRoles>
						}
					/>
				</Route>

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	)
}
