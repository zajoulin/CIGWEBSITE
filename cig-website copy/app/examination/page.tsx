import { redirect } from 'next/navigation';

/** Shorthand address — the canonical route is /learn/examination. */
export default function Page() {
  redirect('/learn/examination');
}
