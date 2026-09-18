/* ==========================================================================
   CIG — 3D Cardiovascular Physical Examination
   --------------------------------------------------------------------------
   The clinical examination module of the Learning Hub: an interactive three
   dimensional thorax used for ECG lead placement, cardiac auscultation and
   surface anatomy, with an optional challenge mode.
   ========================================================================== */

import { Crest } from '../components/brand/Crest';
import { Icon } from '../components/icons/Icon';
import { Chip, Disclaimer } from '../components/ui/primitives';
import {
  ExaminationWorkspace,
  type ExamMode,
} from '../components/exam/ExaminationWorkspace';
import type { ThoraxSex } from '../lib/cardio3d/thorax';
import { auscultationSites, contentStats, ecgLeads, org } from '../lib/content';
import { A, useRouter } from '../lib/router';

const isMode = (v: string | undefined): v is ExamMode =>
  v === 'leads' || v === 'auscultation' || v === 'anatomy';

export const ExaminationPage = () => {
  const { query } = useRouter();
  const mode: ExamMode = isMode(query.mode) ? query.mode : 'leads';
  const sex: ThoraxSex = query.sex === 'female' ? 'female' : 'male';

  return (
    <>
      <header className="page-head page-head-navy stage">
        <div className="grid-bg" />
        <div className="wrap wrap-wide">
          <div className="page-head-row">
            <span className="crest-plate page-head-crest">
              <Crest width="100%" decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">{org.learningHub.short} · Clinical examination</span>
              <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.6rem)', marginTop: 'var(--s-3)' }}>
                3D Cardiovascular Examination
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-3)', maxWidth: '72ch' }}>
                An interactive thorax you can rotate and inspect, with the ribs, sternum and heart
                visible through a translucent chest wall. Place all {ecgLeads.length} ECG
                electrodes against the landmarks that define them, listen at each of the{' '}
                {auscultationSites.length} auscultation areas, and test yourself in challenge mode.
              </p>
              <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
                <Chip tone="blue">Male &amp; female anatomy</Chip>
                <Chip tone="blue">{ecgLeads.length} electrode positions</Chip>
                <Chip tone="blue">{contentStats.heartSounds} heart sounds &amp; murmurs</Chip>
                <Chip tone="blue">Challenge mode</Chip>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ExaminationWorkspace
        initialMode={mode}
        initialSex={sex}
        initialLead={query.lead}
        initialSite={query.site}
      />

      <section className="section-tight">
        <div className="wrap wrap-wide">
          <div className="ecg-crosslinks">
            <A href="/learn/simulation" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="bed" size={20} />
              </div>
              <h4>Put all of this to work on a patient</h4>
              <p>
                The Clinical Simulation drops you at the bedside: read the presentation, place all
                ten electrodes, acquire a 12-lead ECG, listen at the auscultation areas and be
                scored on your interpretation.
              </p>
              <span className="ecg-crosslink-cta">
                Enter the clinical environment
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/learn/ecg" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="monitor" size={20} />
              </div>
              <h4>Watch what the electrodes record</h4>
              <p>
                The bedside monitor, running twenty rhythms with play, pause, scrubbing and
                frame-by-frame stepping.
              </p>
              <span className="ecg-crosslink-cta">
                Open the ECG module
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/anatomy" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="anatomy" size={20} />
              </div>
              <h4>Look inside the heart itself</h4>
              <p>
                The interactive 3D cardiovascular model: chambers, valves, septa, coronary
                circulation and the conduction system.
              </p>
              <span className="ecg-crosslink-cta">
                Open the anatomy viewer
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/learn/keypoints?topic=heart-sounds" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="lightbulb" size={20} />
              </div>
              <h4>Revise heart sounds and murmurs</h4>
              <p>
                The referenced key-point topic covering S1 to S4, the murmurs, their timing and the
                manoeuvres that change them.
              </p>
              <span className="ecg-crosslink-cta">
                Open the key-point topic
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
          </div>

          <div style={{ marginTop: 'var(--s-8)' }}>
            <Disclaimer title={org.disclaimer.title} body={org.disclaimer.body} />
          </div>
          <p className="ecg-sim-note">
            <Icon name="info" size={13} />
            The thorax is a diagrammatic model generated in code — anatomically arranged rather than
            photorealistic — and the heart sounds are synthesised teaching representations rather
            than clinical recordings. Both are labelled as such wherever they appear.
          </p>
        </div>
      </section>
    </>
  );
};
