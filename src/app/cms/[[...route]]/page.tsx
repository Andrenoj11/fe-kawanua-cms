import { Workspace } from "@/components/workspace";
export default async function CMSPage({
  params,
}: {
  params: Promise<{ route?: string[] }>;
}) {
  const { route = [] } = await params;
  return <Workspace route={route} />;
}
