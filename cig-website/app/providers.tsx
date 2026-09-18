'use client';

/* ==========================================================================
   CIG — Next.js router adapter and application shell
   --------------------------------------------------------------------------
   The shared components in /src never import next/navigation directly; they
   use the router abstraction in src/lib/router. This file supplies the
   Next.js implementation of that abstraction, so the exact same component
   tree also runs in the dependency-free single-file build.
   ========================================================================== */

import { Suspense, useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter as useNextRouter, useSearchParams } from 'next/navigation';
import { RouterProvider, type RouterApi } from '../src/lib/router';
import { Navbar } from '../src/components/layout/Navbar';
import { Footer } from '../src/components/layout/Footer';

const RouterBridge = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();

  const api = useMemo<RouterApi>(() => {
    const query: Record<string, string> = {};
    searchParams?.forEach((value, key) => {
      query[key] = value;
    });
    const path =
      pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    return {
      path,
      query,
      hash: '',
      hrefFor: (href) => href,
      navigate: (href, options) => {
        // scroll:false matters for the in-place updates the clinical modules
        // make — changing rhythm should not jump the page back to the top.
        const opts = options?.scroll === false ? { scroll: false } : undefined;
        if (options?.replace) nextRouter.replace(href, opts);
        else nextRouter.push(href, opts);
      },
    };
  }, [pathname, searchParams, nextRouter]);

  return <RouterProvider value={api}>{children}</RouterProvider>;
};

export const Providers = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={null}>
    <RouterBridge>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </RouterBridge>
  </Suspense>
);
