/* ==========================================================================
   CIG — Official crest
   --------------------------------------------------------------------------
   The single place the CIG identity is rendered. Two variants of the same
   artwork, never distorted (the natural aspect ratio is preserved and only
   the width is set):

     • <Crest />       the full lockup — university wordmark above the shield
     • <CrestMark />   the shield alone, for compact placements

   The artwork is inlined as a data URI by scripts/gen-content.mjs so that the
   Next.js app and the dependency-free single-file build both display it, with
   no network request and nothing to break offline.
   ========================================================================== */

import { CIG_LOCKUP, CIG_MARK } from '../../data/brand.generated';
import { org } from '../../lib/content';

/** Intrinsic pixel dimensions of the inlined artwork, so nothing is stretched. */
const LOCKUP = { width: 480, height: 536 };
const MARK = { width: 288, height: 293 };

export interface CrestProps {
  /**
   * Rendered width. A number is treated as CSS pixels; height always follows
   * the natural aspect ratio, so the crest is never distorted. Omit it when
   * `className` already sizes the element.
   */
  width?: number | string;
  className?: string;
  /** Decorative placements (next to a visible wordmark) should pass true. */
  decorative?: boolean;
  alt?: string;
}

const sizeOf = (width: number | string | undefined) =>
  width === undefined
    ? { height: 'auto' }
    : { width: typeof width === 'number' ? `${width}px` : width, height: 'auto' };

export const Crest = ({ width, className, decorative, alt }: CrestProps) => (
  <img
    src={CIG_LOCKUP}
    width={LOCKUP.width}
    height={LOCKUP.height}
    className={'crest' + (className ? ' ' + className : '')}
    style={sizeOf(width)}
    alt={decorative ? '' : (alt ?? org.crest.alt)}
    aria-hidden={decorative ? true : undefined}
    loading="lazy"
    decoding="async"
  />
);

export const CrestMark = ({ width, className, decorative, alt }: CrestProps) => (
  <img
    src={CIG_MARK}
    width={MARK.width}
    height={MARK.height}
    className={'crest' + (className ? ' ' + className : '')}
    style={sizeOf(width)}
    alt={decorative ? '' : (alt ?? `${org.abbr} crest`)}
    aria-hidden={decorative ? true : undefined}
    decoding="async"
  />
);

/**
 * The crest with the organisation name beside it — the standard CIG lockup
 * used in the navigation, the footer and page headers.
 */
export const BrandLockup = ({
  size = 42,
  showUniversity = true,
}: {
  size?: number;
  showUniversity?: boolean;
}) => (
  <>
    <span className="brand-mark" style={{ width: size, height: size }}>
      <CrestMark width="100%" decorative />
    </span>
    <span className="brand-text">
      <span className="brand-abbr">{org.abbr}</span>
      <span className="brand-full">{org.name}</span>
      {showUniversity ? <span className="brand-uni">{org.university.name}</span> : null}
    </span>
  </>
);
