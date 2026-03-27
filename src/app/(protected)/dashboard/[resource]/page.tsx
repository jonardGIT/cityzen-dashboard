import { CrudResourcePage } from "@/components/crud/CrudResourcePage";

interface ResourcePageProps {
  params: Promise<{ resource: string }>;
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { resource } = await params;
  return <CrudResourcePage resourceName={resource} />;
}
