import type { Metadata } from 'next';
import Leadership from '../_client/Leadership';

export const metadata: Metadata = {
  title: 'Leadership & Teams',
  description:
    'The CIG leadership structure: president, vice presidents, team heads and the members of each student team.',
};

export default function Page() {
  return <Leadership />;
}
