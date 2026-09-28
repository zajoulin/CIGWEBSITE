import type { Metadata } from 'next';
import Simulation from '../../_client/Simulation';

export const metadata: Metadata = {
  title: 'Clinical Simulation',
  description:
    'Enter the clinical environment: examine a simulated patient, obtain a 12-lead ECG by placing all ten electrodes against their anatomical landmarks, interpret the tracing systematically and be scored on your clinical reasoning.',
};

export default function Page() {
  return <Simulation />;
}
