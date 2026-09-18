import type { Metadata } from 'next';
import About from '../_client/About';

export const metadata: Metadata = {
  title: 'About CIG',
  description:
    'Who the Cardiology Interest Group are, what we do, our teams and leadership, and how to get in touch.',
};

export default function Page() {
  return <About />;
}
