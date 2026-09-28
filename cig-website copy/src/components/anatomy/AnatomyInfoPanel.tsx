/* ==========================================================================
   CIG — Anatomical structure information panel
   Six tabs: Anatomy, Physiology, Pathology, Clinical, Key Points, References,
   plus the knowledge-graph links to related structures, diseases and topics.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { A } from '../../lib/router';
import { Icon } from '../icons/Icon';
import {
  Bullets,
  Chip,
  DataList,
  References,
  TabPanel,
  Tabs,
  type TabDef,
} from '../ui/primitives';
import {
  anatomyCategoryById,
  diseaseById,
  keyPointById,
  resolveReferences,
  structureById,
} from '../../lib/content';
import type { AnatomicalStructure } from '../../lib/types';

const TABS: TabDef[] = [
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'physiology', label: 'Physiology' },
  { id: 'pathology', label: 'Pathology' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'key', label: 'Key Points' },
  { id: 'refs', label: 'References' },
];

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ marginBottom: 'var(--s-6)' }}>
    <h3
      className="footer-h"
      style={{ marginBottom: 'var(--s-3)', color: 'var(--blue)' }}
    >
      {title}
    </h3>
    {children}
  </section>
);

export const AnatomyInfoPanel = ({
  structure,
  onNavigateStructure,
  showHeader = true,
}: {
  structure: AnatomicalStructure;
  onNavigateStructure?: (id: string) => void;
  showHeader?: boolean;
}) => {
  const [tab, setTab] = useState('anatomy');
  useEffect(() => setTab('anatomy'), [structure.id]);

  const category = anatomyCategoryById.get(structure.category);
  const refs = resolveReferences(structure.references);

  return (
    <>
      {showHeader ? (
        <div className="info-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              className="tree-swatch"
              style={{ background: structure.color, width: 10, height: 10 }}
              aria-hidden="true"
            />
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
              {category?.label ?? 'Anatomy'}
            </span>
          </div>
          {/* The selected structure is the subject of the page, so its name is
              the h2 under the page h1; the panel's blocks below are h3s. */}
          <h2 style={{ fontSize: 'var(--t-xl)', letterSpacing: '-0.024em' }}>{structure.name}</h2>
          {structure.latin ? (
            <p style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 2 }}>
              {structure.latin}
              {structure.abbr ? ` · ${structure.abbr}` : ''}
            </p>
          ) : null}
          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)', marginTop: 'var(--s-3)', lineHeight: 1.6 }}>
            {structure.summary}
          </p>
        </div>
      ) : null}

      <div className="info-tabs">
        <Tabs tabs={TABS} active={tab} onChange={setTab} idPrefix={`anat-${structure.id}`} />
      </div>

      <div className="info-body">
        <TabPanel id="anatomy" idPrefix={`anat-${structure.id}`} active={tab}>
          <DataList
            rows={[
              { key: 'Location', value: structure.anatomy.location },
              { key: 'Shape', value: structure.anatomy.shape },
              {
                key: 'Relations',
                value: <Bullets items={structure.anatomy.relations} />,
              },
              {
                key: 'Attachments',
                value: <Bullets items={structure.anatomy.attachments} />,
              },
              { key: 'Blood supply', value: structure.anatomy.bloodSupply },
              { key: 'Venous drainage', value: structure.anatomy.venousDrainage },
              { key: 'Innervation', value: structure.anatomy.innervation },
              { key: 'Anatomical function', value: structure.anatomy.function },
            ]}
          />
        </TabPanel>

        <TabPanel id="physiology" idPrefix={`anat-${structure.id}`} active={tab}>
          <Block title="Function">
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.62 }}>
              {structure.physiology.function}
            </p>
          </Block>

          {structure.physiology.pressures.length ? (
            <Block title="Pressures & values">
              <DataList
                rows={structure.physiology.pressures.map((p) => ({
                  key: p.label,
                  value: (
                    <>
                      <span className="mono" style={{ color: 'var(--blue-bright)' }}>
                        {p.value}
                      </span>
                      {p.note ? (
                        <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: 'var(--t-xs)', marginTop: 2 }}>
                          {p.note}
                        </span>
                      ) : null}
                    </>
                  ),
                }))}
              />
            </Block>
          ) : null}

          <Block title="Electrical activity">
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.62 }}>
              {structure.physiology.electrical}
            </p>
          </Block>

          <Block title="Haemodynamics">
            <Bullets items={structure.physiology.hemodynamics} />
          </Block>

          <Block title="Related concepts">
            <div className="tag-row">
              {structure.physiology.concepts.map((c) => (
                <Chip key={c} tone="blue">
                  {c}
                </Chip>
              ))}
            </div>
          </Block>
        </TabPanel>

        <TabPanel id="pathology" idPrefix={`anat-${structure.id}`} active={tab}>
          <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
            {structure.pathology.map((p) => {
              const disease = p.diseaseId ? diseaseById.get(p.diseaseId) : undefined;
              const body = (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h4 style={{ fontSize: 'var(--t-sm)', fontWeight: 600 }}>{p.name}</h4>
                    {disease ? <Icon name="arrow-up-right" size={12} className="ic" /> : null}
                  </div>
                  <p style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    {p.note}
                  </p>
                </>
              );
              return disease ? (
                <A
                  key={p.name}
                  href={`/diseases/${disease.id}`}
                  className="card card-pad card-hover"
                  style={{ display: 'block', padding: 'var(--s-4)' }}
                >
                  {body}
                </A>
              ) : (
                <div key={p.name} className="card" style={{ padding: 'var(--s-4)' }}>
                  {body}
                </div>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel id="clinical" idPrefix={`anat-${structure.id}`} active={tab}>
          <Block title="Clinical relevance">
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', lineHeight: 1.62 }}>
              {structure.clinical.relevance}
            </p>
          </Block>
          <Block title="Common conditions">
            <Bullets items={structure.clinical.conditions} tone="crimson" />
          </Block>
          <Block title="Examination findings">
            <Bullets items={structure.clinical.examination} />
          </Block>
          <Block title="Imaging">
            <Bullets items={structure.clinical.imaging} />
          </Block>
          <Block title="Procedures & interventions">
            <Bullets items={structure.clinical.procedures} />
          </Block>
        </TabPanel>

        <TabPanel id="key" idPrefix={`anat-${structure.id}`} active={tab}>
          <ol style={{ display: 'grid', gap: 'var(--s-3)' }}>
            {structure.keyPoints.map((k, i) => (
              <li
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 1fr',
                  gap: 'var(--s-3)',
                  alignItems: 'start',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--blue)',
                    paddingTop: 3,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink)', lineHeight: 1.6 }}>{k}</span>
              </li>
            ))}
          </ol>
        </TabPanel>

        <TabPanel id="refs" idPrefix={`anat-${structure.id}`} active={tab}>
          <References items={refs} />
          <p
            style={{
              marginTop: 'var(--s-5)',
              fontSize: 'var(--t-2xs)',
              color: 'var(--ink-3)',
              lineHeight: 1.6,
            }}
          >
            References are provided so that every statement can be checked against an authoritative
            source. CIG members: add or replace references in{' '}
            <code className="mono">content/references.json</code>.
          </p>
        </TabPanel>

        {/* Knowledge-graph links, always visible beneath the tab content. */}
        <div style={{ marginTop: 'var(--s-8)', paddingTop: 'var(--s-6)', borderTop: '1px solid var(--line)' }}>
          {structure.related.structures.length ? (
            <Block title="Related structures">
              <div className="related-grid">
                {structure.related.structures.map((id) => {
                  const s = structureById.get(id);
                  if (!s) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="related-link"
                      onClick={() => onNavigateStructure?.(id)}
                    >
                      <span className="tree-swatch" style={{ background: s.color }} aria-hidden="true" />
                      <span style={{ flex: 1 }}>{s.name}</span>
                      <Icon name="chevron-right" size={12} />
                    </button>
                  );
                })}
              </div>
            </Block>
          ) : null}

          {structure.related.diseases.length ? (
            <Block title="Related diseases">
              <div className="related-grid">
                {structure.related.diseases.map((id) => {
                  const d = diseaseById.get(id);
                  if (!d) return null;
                  return (
                    <A key={id} href={`/diseases/${d.id}`} className="related-link">
                      <Icon name="heart" size={13} className="ic" />
                      <span style={{ flex: 1 }}>{d.name}</span>
                      <Icon name="arrow-up-right" size={12} />
                    </A>
                  );
                })}
              </div>
            </Block>
          ) : null}

          {structure.related.keyPoints.length ? (
            <Block title="Related physiology & key points">
              <div className="related-grid">
                {structure.related.keyPoints.map((id) => {
                  const k = keyPointById.get(id);
                  if (!k) return null;
                  return (
                    <A key={id} href={`/learn/keypoints?topic=${k.id}`} className="related-link">
                      <Icon name="lightbulb" size={13} className="ic" />
                      <span style={{ flex: 1 }}>{k.title}</span>
                      <Icon name="arrow-up-right" size={12} />
                    </A>
                  );
                })}
              </div>
            </Block>
          ) : null}
        </div>
      </div>
    </>
  );
};
