/* ==========================================================================
   CIG — Clinical Simulation
   --------------------------------------------------------------------------
   The Learning Hub's flagship bedside module. The page itself is only a
   frame: the identity band, the safety statement, the cross-links back into
   the rest of the Hub, and the module.

   Deep links: /learn/simulation?level=advanced · &case=<id>
   ========================================================================== */

import { Crest } from '../components/brand/Crest';
import { Icon } from '../components/icons/Icon';
import { Chip, Disclaimer } from '../components/ui/primitives';
import { ClinicalSimulation } from '../components/simulation/ClinicalSimulation';
import { clinicalCases, contentStats, org, simulationConfig } from '../lib/content';
import { A, useRouter } from '../lib/router';

export const SimulationPage = () => {
  const { query } = useRouter();

  return (
    <>
      <header className="page-head page-head-navy stage sim-head">
        <div className="grid-bg" />
        <div className="wrap wrap-wide">
          <div className="page-head-row">
            <span className="crest-plate page-head-crest">
              <Crest width="100%" decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">{simulationConfig.eyebrow}</span>
              <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.6rem)', marginTop: 'var(--s-3)' }}>
                {simulationConfig.title}
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-3)', maxWidth: '74ch' }}>
                {simulationConfig.lede}
              </p>
              <div className="tag-row" style={{ marginTop: 'var(--s-5)' }}>
                <Chip tone="blue">{clinicalCases.length} reviewed cases</Chip>
                <Chip tone="blue">{contentStats.ecgLeads} electrodes</Chip>
                <Chip tone="blue">12-lead acquisition</Chip>
                <Chip tone="blue">{contentStats.auscultationSites} auscultation areas</Chip>
              </div>
              <p className="sim-safety">
                <Icon name="warning" size={13} />
                {simulationConfig.safetyNote}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="section-tight">
        <div className="wrap wrap-wide">
          <ClinicalSimulation initialLevel={query.level} initialCase={query.case} />
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap wrap-wide">
          <div className="ecg-crosslinks">
            <A href="/learn/ecg" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="monitor" size={20} />
              </div>
              <h4>Study the rhythms one at a time</h4>
              <p>
                The bedside monitor module runs every rhythm in the library on a calibrated,
                scrubbable trace with a synchronised explanation of what the heart is doing.
              </p>
              <span className="ecg-crosslink-cta">
                Open the ECG module
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/learn/examination" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="stethoscope" size={20} />
              </div>
              <h4>Explore the chest in three dimensions</h4>
              <p>
                The clinical examination module puts the same electrodes and auscultation areas on a
                rotatable 3D thorax, with the ribs, sternum and heart visible beneath the chest wall.
              </p>
              <span className="ecg-crosslink-cta">
                Open the examination module
                <Icon name="arrow-right" size={12} />
              </span>
            </A>
            <A href="/learn/keypoints?topic=ecg-essentials" className="card card-pad card-hover card-action">
              <div className="hub-icon">
                <Icon name="lightbulb" size={20} />
              </div>
              <h4>Revise the systematic approach</h4>
              <p>
                ECG Essentials: rate, rhythm, axis, intervals and the patterns worth committing to
                memory — the method this simulation asks you to apply.
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
            Every patient in this module is fictional and written for teaching. The room, the
            monitor, the waveforms and the heart sounds are generated by CIG&rsquo;s own simulation;
            they describe no real person, the device is a brand-neutral educational representation
            rather than any manufacturer&rsquo;s product, and the clinical-action questions describe
            principles rather than instructions for treating a patient.
          </p>
        </div>
      </section>
    </>
  );
};
export default SimulationPage;