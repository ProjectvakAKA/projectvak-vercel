import { DashboardLayout } from "@/components/dashboard-layout"
import { PropertyViewPage } from "@/components/property-view-page"

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <PropertyViewPage propertyId={id} />
    </DashboardLayout>
  )
}
