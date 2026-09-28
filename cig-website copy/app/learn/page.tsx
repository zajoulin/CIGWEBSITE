import type { Metadata } from 'next';
import Learn from '../_client/Learn';
import org from '../../content/org.json';

export const metadata: Metadata = {
  title: org.learningHub.name,
  description: org.learningHub.blurb,
};

export default function Page() {
  return <Learn />;
}
