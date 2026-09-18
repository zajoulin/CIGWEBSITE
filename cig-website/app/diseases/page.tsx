import type { Metadata } from 'next';
import Diseases from '../_client/Diseases';

export const metadata: Metadata = {
  title: 'Cardiovascular Diseases',
  description:
    'A disease explorer covering 27 cardiovascular conditions across twelve categories, with step-by-step pathophysiology and animated visualisations.',
};

export default function Page() {
  return <Diseases />;
}
