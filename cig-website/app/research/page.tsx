import type { Metadata } from 'next';
import Research from '../_client/Research';

export const metadata: Metadata = {
  title: 'CIG Research',
  description:
    "The Cardiology Interest Group's own research activity: what the group publishes and presents, and how students propose a cardiovascular research idea of their own.",
};

export default function Page() {
  return <Research />;
}
