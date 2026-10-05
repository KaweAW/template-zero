import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Handles locale detection and redirects:
//   "/"      -> "/de" (or the visitor's browser language if it is an active locale)
//   "/menu"  -> "/<locale>/menu"   <- this is the URL printed in the table QR codes
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any path with a file extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
