import type { Metadata } from 'next';
import Activities from '../_client/Activities';

export const metadata: Metadata = {
  title: 'Activities & Events',
  description:
    "CIG's year-round programme: teaching sessions, journal clubs, research mentorship, clinical skills workshops, clinical exposure and community outreach.",
};

export default function Page() {
  return <Activities />;
}
