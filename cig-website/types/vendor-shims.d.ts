/**
 * Minimal ambient declarations for React 19 used by the dependency-free static
 * build in this sandbox (no network access to npm for @types/react).
 *
 * This file is used ONLY by tsconfig.static.json. When you run the Next.js app
 * normally (`npm install && npm run dev`), the real `@types/react` package is
 * installed and this file is excluded — see tsconfig.json.
 */

declare namespace JSX {
  type Element = any;
  interface ElementClass {
    render?: any;
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes {
    key?: string | number | null;
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react' {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | Iterable<ReactNode>;
  export interface ReactElement {
    type: any;
    props: any;
    key: string | number | null;
  }
  export type Key = string | number;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export type CSSProperties = Record<string, string | number | undefined>;
  export interface RefObject<T> {
    readonly current: T | null;
  }
  export interface MutableRefObject<T> {
    current: T;
  }
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type DependencyList = ReadonlyArray<unknown>;

  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [
    S | undefined,
    Dispatch<SetStateAction<S | undefined>>,
  ];
  export function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useMemo<T>(factory: () => T, deps: DependencyList): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: DependencyList): T;
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useId(): string;
  export function useReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initial: S,
  ): [S, Dispatch<A>];
  export function useContext<T>(context: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export interface Context<T> {
    Provider: any;
    Consumer: any;
    displayName?: string;
  }
  export function memo<T>(component: T): T;
  export function forwardRef<T, P>(render: (props: P, ref: any) => ReactElement | null): FC<P>;
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  export const Fragment: any;
  export const StrictMode: any;
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react/jsx-dev-runtime' {
  export const jsxDEV: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment, options?: any): {
    render(children: any): void;
    unmount(): void;
  };
  export function hydrateRoot(container: Element, children: any, options?: any): any;
}

declare module '*.json' {
  const value: any;
  export default value;
}
