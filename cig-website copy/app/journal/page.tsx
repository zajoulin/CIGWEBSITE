import type { Metadata } from 'next';
import Journal from '../_client/Journal';
import journal from '../../content/journal.json';

export const metadata: Metadata = {
  title: journal.name,
  description:
    "CIG's publication activity: student-written cardiovascular writing edited by CIG members, and the journal club behind it.",
};

export default function Page() {
  return <Journal />;
}
