import { redirect } from 'next/navigation';

/** Shorthand address — the canonical route is /learn/simulation. */
export default function Page() {
  redirect('/learn/simulation');
}
