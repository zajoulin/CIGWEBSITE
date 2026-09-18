import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DiseaseDetail from '../../_client/DiseaseDetail';
import { diseaseById, diseases } from '../../../src/lib/content';

/** Pre-renders a static page for every disease module. */
export function generateStaticParams() {
  return diseases.map((d) => ({ slug: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const disease = diseaseById.get(slug);
  if (!disease) return { title: 'Disease module not found' };
  return {
    title: disease.name,
    description: disease.tagline,
    openGraph: { title: disease.name, description: disease.tagline },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!diseaseById.has(slug)) notFound();
  return <DiseaseDetail id={slug} />;
}
