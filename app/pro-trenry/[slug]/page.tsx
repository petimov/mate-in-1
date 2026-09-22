import { redirect } from "next/navigation";

export default async function ProTrenrySlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/pro-trenery/${slug}`);
}
