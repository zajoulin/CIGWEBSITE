import type { Metadata } from 'next';
import KeyPoints from '../../_client/KeyPoints';

export const metadata: Metadata = {
  title: 'Cardiovascular Key Points',
  description:
    'Concise, referenced cardiovascular revision topics covering the material students are examined on and use on the ward, each with clinical pearls and citations.',
};

export default function Page() {
  return <KeyPoints />;
}
