import type { Metadata } from 'next';
import Ecg from '../../_client/Ecg';

export const metadata: Metadata = {
  title: 'ECG & Bedside Monitoring',
  description:
    'A simulated bedside cardiac monitor running twenty clinically important ECG rhythms, with play, pause, scrubbing, frame-by-frame stepping and a synchronised physiological explanation.',
};

export default function Page() {
  return <Ecg />;
}
