import type { Metadata } from 'next';
import Examination from '../../_client/Examination';

export const metadata: Metadata = {
  title: '3D Cardiovascular Examination',
  description:
    'An interactive 3D thorax for ECG lead placement and cardiac auscultation: place all ten electrodes against their anatomical landmarks, listen at the five auscultation areas, and test yourself.',
};

export default function Page() {
  return <Examination />;
}
