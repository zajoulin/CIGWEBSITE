import type { Metadata } from 'next';
import Anatomy from '../_client/Anatomy';

export const metadata: Metadata = {
  title: 'Interactive Cardiovascular Anatomy',
  description:
    'An interactive 3D cardiovascular model with 24 selectable structures, each carrying referenced anatomy, physiology, pathology and clinical detail.',
};

export default function Page() {
  return <Anatomy />;
}
