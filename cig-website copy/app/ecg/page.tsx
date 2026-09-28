import { redirect } from 'next/navigation';

/** Shorthand address — the canonical route is /learn/ecg. */
export default function Page() {
  redirect('/learn/ecg');
}
