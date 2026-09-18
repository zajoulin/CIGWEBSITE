import type { Metadata } from 'next';
import Glossary from '../../_client/Glossary';

export const metadata: Metadata = {
  title: 'Cardiovascular Glossary',
  description:
    'A searchable cardiovascular glossary: definitions, formulae and typical values, each term cross-linked to the anatomy, physiology and disease modules it belongs to.',
};

export default function Page() {
  return <Glossary />;
}
