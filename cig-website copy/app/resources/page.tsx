import { redirect } from 'next/navigation';

/**
 * "Resources" used to be a second navigation entry pointing into the Research
 * section's glossary tab. The educational resources live in the Learning Hub.
 */
export default function Page() {
  redirect('/learn');
}
