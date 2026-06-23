import { ProjectPhotoReportsSection } from './ProjectPhotoReportsSection'

export function ProjectDesignFilesSection({ projectId }: { projectId: string }) {
  return (
    <ProjectPhotoReportsSection
      projectId={projectId}
      category="DESIGN"
      title="Дизайн-файли"
    />
  )
}
