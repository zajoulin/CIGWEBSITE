import { redirect } from 'next/navigation';

/** Shorthand address — the canonical route is /leadership. */
export default function Page() {
  redirect('/leadership');
}
