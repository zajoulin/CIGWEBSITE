import { redirect } from 'next/navigation';

/** Legacy short URL — the glossary is a Learning Hub resource. */
export default function Page() {
  redirect('/learn/glossary');
}
