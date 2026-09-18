import { redirect } from 'next/navigation';

/** Shorthand address — the canonical route is /learn/keypoints. */
export default function Page() {
  redirect('/learn/keypoints');
}
