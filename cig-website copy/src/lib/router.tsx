/* ==========================================================================
   CIG — Routing abstraction
   --------------------------------------------------------------------------
   Shared components never import a framework router directly. They use the
   <A> link component and the useRoute() hook from here, and the host supplies
   the implementation:

     • the Next.js app wraps the tree in <RouterProvider> backed by
       next/navigation, so links are real <a href> with client navigation;
     • the single-file static build wraps it in a hash-based provider.

   Same components, both targets, no duplication.
   ========================================================================== */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface RouteState {
  /** Current pathname, always starting with "/" and without a trailing slash (except "/"). */
  path: string;
  /** Current query string parameters. */
  query: Record<string, string>;
  /** Current hash fragment without the leading "#". */
  hash: string;
}

export interface RouterApi extends RouteState {
  navigate: (href: string, options?: { replace?: boolean; scroll?: boolean }) => void;
  /** Turns an internal href into whatever the host needs in an <a href>. */
  hrefFor: (href: string) => string;
}

const noop = (): void => {};

const defaultApi: RouterApi = {
  path: '/',
  query: {},
  hash: '',
  navigate: noop,
  hrefFor: (h) => h,
};

const RouterContext = createContext<RouterApi>(defaultApi);

export const RouterProvider = ({
  value,
  children,
}: {
  value: RouterApi;
  children: ReactNode;
}) => <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;

export const useRouter = (): RouterApi => useContext(RouterContext);

export const useRoute = (): RouteState => {
  const { path, query, hash } = useRouter();
  return { path, query, hash };
};

/** True when `href` is the current page (or a section of it). */
export const useIsActive = (href: string): boolean => {
  const { path } = useRouter();
  if (href === '/') return path === '/';
  return path === href || path.startsWith(href + '/');
};

export interface AProps {
  href: string;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  onClick?: () => void;
  /** Renders as a plain external anchor opening in a new tab. */
  external?: boolean;
  [key: string]: unknown;
}

/**
 * The one link component used everywhere. Internal links go through the host
 * router; external links open in a new tab with the correct rel attributes.
 */
export const A = ({
  href,
  children,
  className,
  ariaLabel,
  title,
  onClick,
  external,
  ...rest
}: AProps) => {
  const router = useRouter();
  const isExternal =
    external ||
    /^(https?:)?\/\//.test(href) ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:');

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        title={title}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={router.hrefFor(href)}
      className={className}
      aria-label={ariaLabel}
      title={title}
onClick={(e: any) => {        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        router.navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
};

/* ------------------------------------------------- Hash router (static) -- */

const parseHash = (): RouteState => {
  if (typeof window === 'undefined') return { path: '/', query: {}, hash: '' };
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathAndQuery, frag = ''] = raw.split('#');
  const [rawPath, rawQuery = ''] = pathAndQuery.split('?');
  let path = rawPath || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const query: Record<string, string> = {};
  for (const pair of rawQuery.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return { path, query, hash: frag };
};

/**
 * Router implementation for the single-file static build. Uses the URL hash so
 * the whole application works from a single HTML document with no server.
 */
export const useHashRouter = (): RouterApi => {
  const [state, setState] = useState<RouteState>(() => parseHash());

  useEffect(() => {
    const onChange = () => setState(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return useMemo<RouterApi>(
    () => ({
      ...state,
      hrefFor: (href: string) => '#' + href,
      navigate: (href, options) => {
        const [pathPart, frag] = href.split('#');
        const next = '#' + (pathPart || '/');
        if (window.location.hash === next && !frag) {
          if (options?.scroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // Some hosts refuse history writes — an embedded preview, a sandboxed
        // frame, a file opened under a restrictive policy. Navigation is a
        // convenience here, so a refusal must never propagate as a render
        // error: fall back to updating the hash, and failing that, to a
        // manual state update so the application still moves.
        try {
          if (options?.replace) {
            window.location.replace(next + (frag ? '#' + frag : ''));
          } else {
            window.location.hash = (pathPart || '/') + (frag ? '#' + frag : '');
          }
        } catch {
          try {
            window.location.hash = (pathPart || '/') + (frag ? '#' + frag : '');
          } catch {
            setState(parseHash());
          }
        }
        if (options?.scroll !== false && !frag) {
          window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
        }
      },
    }),
    [state],
  );
};
