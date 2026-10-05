import { notFound } from 'next/navigation';

/** Any unknown URL under /<locale>/ ends up on the localised 404 page. */
export default function CatchAll() {
  notFound();
}
