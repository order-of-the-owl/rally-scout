import { clerkMiddleware } from '@clerk/nextjs/server';

import { Route } from '@/lib/config/routes';

export default clerkMiddleware({
  signInUrl: Route.SignIn,
  signUpUrl: Route.SignUp,
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
