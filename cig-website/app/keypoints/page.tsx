import { redirect } from 'next/navigation';

/** Legacy short URL — the key points are a Learning Hub resource. */
export default function Page() {
  redirect('/learn/keypoints');
}
