/* ==========================================================================
   CIG — Research idea submission form
   --------------------------------------------------------------------------
   A student describes an idea; the CIG research team receives it.

   The platform has no accounts and no database, and this form deliberately
   does not add either. There are exactly two delivery paths, decided by
   `idea.endpoint` in content/research-config.json:

     • endpoint === null  — the submission is composed into the visitor's own
       email client, addressed to the CIG contact address. Nothing is stored
       anywhere, and the confirmation says exactly that rather than claiming
       the message was received.

     • endpoint === "https://…" — the submission is POSTed as JSON to CIG's own
       form service (Formspree, a Google Form endpoint, a serverless
       function…). It is a plain public URL; no key or credential belongs in
       the content file, because everything here ships to the browser.

   Nothing in this component ever reports success it has not had.
   ========================================================================== */

import { useId, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import { org, researchConfig } from '../../lib/content';

type Status = 'idle' | 'sending' | 'sent' | 'mailto' | 'error';

interface Values {
  name: string;
  email: string;
  idea: string;
  area: string;
  experience: string;
  extra: string;
}

type FieldName = keyof Values;

const EMPTY: Values = { name: '', email: '', idea: '', area: '', experience: '', extra: '' };

/** Deliberately permissive: enough to catch a typo, never enough to reject a real address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MIN_IDEA = 40;

const validate = (v: Values): Partial<Record<FieldName, string>> => {
  const e: Partial<Record<FieldName, string>> = {};
  if (!v.name.trim()) e.name = 'Please enter your full name.';
  if (!v.email.trim()) e.email = 'Please enter an email address so the team can reply.';
  else if (!EMAIL.test(v.email.trim())) e.email = 'That does not look like an email address.';
  if (!v.idea.trim()) e.idea = 'Please describe the idea you would like to propose.';
  else if (v.idea.trim().length < MIN_IDEA)
    e.idea = `Please add a little more — at least ${MIN_IDEA} characters, so the team can understand the idea.`;
  if (!v.area) e.area = 'Please choose the area your idea belongs to.';
  if (!v.experience) e.experience = 'Please tell us whether you have taken part in research before.';
  return e;
};

/** The submission as plain text, used for the email body and the copy-out block. */
const asText = (v: Values): string =>
  [
    `Full name: ${v.name.trim()}`,
    `Email: ${v.email.trim()}`,
    `Area of interest: ${v.area}`,
    `Previous research experience: ${v.experience}`,
    '',
    'Research idea / proposal:',
    v.idea.trim(),
    ...(v.extra.trim() ? ['', 'Additional information:', v.extra.trim()] : []),
  ].join('\n');

export const ResearchIdeaForm = () => {
  const cfg = researchConfig.idea;
  const uid = useId();
  const fid = (n: string) => `${uid}-${n}`;

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [sentText, setSentText] = useState('');
  const formRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const set = (field: FieldName, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (showErrors) setErrors(validate({ ...values, [field]: value }));
  };

  const focusResult = () => {
    window.requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: false }));
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setShowErrors(true);
    if (Object.keys(found).length) {
      const first = (Object.keys(found) as FieldName[])[0];
      const el = document.getElementById(fid(first));
      el?.focus();
      return;
    }

    const text = asText(values);
    setSentText(text);

    if (cfg.endpoint) {
      setStatus('sending');
      try {
        const res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            area: values.area,
            experience: values.experience,
            idea: values.idea.trim(),
            additional: values.extra.trim(),
            source: `${org.abbr} website — research idea`,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus('sent');
        setValues(EMPTY);
        setShowErrors(false);
        focusResult();
      } catch {
        // Never report a delivery that did not happen.
        setStatus('error');
        focusResult();
      }
      return;
    }

    // No endpoint configured: hand the submission to the visitor's own mail
    // client. The confirmation below says that this is what happened.
    //
    // While the contact address in content/org.json is still the placeholder,
    // opening a mail client would compose a message addressed to nowhere, so
    // the submission is only shown for the visitor to copy.
    if (!org.contact.placeholder) {
      const href =
        `mailto:${encodeURIComponent(org.contact.email)}` +
        `?subject=${encodeURIComponent(`${cfg.emailSubjectPrefix} — ${values.name.trim()}`)}` +
        `&body=${encodeURIComponent(text)}`;
      try {
        window.location.href = href;
      } catch {
        /* Opening the mail client is best-effort; the text is shown either way. */
      }
    }
    setStatus('mailto');
    focusResult();
  };

  const reset = () => {
    setStatus('idle');
    setSentText('');
    setValues(EMPTY);
    setErrors({});
    setShowErrors(false);
    window.requestAnimationFrame(() => document.getElementById(fid('name'))?.focus());
  };

  const err = (f: FieldName) => (showErrors ? errors[f] : undefined);

  const describedBy = (f: FieldName, ...extra: string[]) =>
    [...extra, err(f) ? fid(`${f}-error`) : ''].filter(Boolean).join(' ') || undefined;

  /* ------------------------------------------------------------ Result -- */

  if (status === 'sent' || status === 'mailto' || status === 'error') {
    const ok = status !== 'error';
    // A mail client was only opened if there was a real address to open it with.
    const opened = !org.contact.placeholder;
    const title =
      status === 'sent'
        ? cfg.confirmationTitle
        : status === 'mailto'
          ? opened
            ? cfg.mailtoTitle
            : cfg.mailtoTitleManual
          : cfg.errorTitle;
    const body =
      status === 'sent'
        ? cfg.confirmationBody
        : status === 'mailto'
          ? opened
            ? cfg.mailtoBody
            : cfg.mailtoBodyManual
          : cfg.errorBody;
    return (
      <div
        className={'form-result' + (ok ? '' : ' form-result-error')}
        ref={resultRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
      >
        <div className="form-result-icon" aria-hidden="true">
          <Icon name={ok ? 'check' : 'warning'} size={22} />
        </div>
        <h3>{title}</h3>
        <p>{body}</p>

        {status !== 'sent' ? (
          <>
            <p className="form-result-address">
              <Icon name="mail" size={14} />
              <a href={`mailto:${org.contact.email}`}>{org.contact.email}</a>
            </p>
            <details className="form-result-copy" open={!opened}>
              <summary>Show the submission so you can copy it</summary>
              <pre>{sentText}</pre>
            </details>
          </>
        ) : null}

        <p className="form-note">{cfg.disclaimer}</p>

        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          <Icon name="refresh" size={13} />
          {status === 'error' ? 'Try again' : 'Submit another idea'}
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------- Form -- */

  return (
    <section className="card card-pad research-form" id="research-idea" ref={formRef}>
      <div className="research-form-head">
        <h3>{cfg.formTitle}</h3>
        <p>{cfg.formLede}</p>
      </div>

      <form className="form-grid" onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor={fid('name')}>
            Full name <span className="form-req">required</span>
          </label>
          <input
            id={fid('name')}
            className="input"
            type="text"
            name="name"
            autoComplete="name"
            value={values.name}
            aria-invalid={err('name') ? true : undefined}
            aria-describedby={describedBy('name')}
            onChange={(e: { target: { value: string } }) => set('name', e.target.value)}
          />
          {err('name') ? (
            <p className="form-error" id={fid('name-error')}>
              <Icon name="warning" size={12} />
              {err('name')}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label htmlFor={fid('email')}>
            Email address <span className="form-req">required</span>
          </label>
          <input
            id={fid('email')}
            className="input"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            aria-invalid={err('email') ? true : undefined}
            aria-describedby={describedBy('email', fid('email-hint'))}
            onChange={(e: { target: { value: string } }) => set('email', e.target.value)}
          />
          <p className="form-hint" id={fid('email-hint')}>
            The research team will reply to this address.
          </p>
          {err('email') ? (
            <p className="form-error" id={fid('email-error')}>
              <Icon name="warning" size={12} />
              {err('email')}
            </p>
          ) : null}
        </div>

        <div className="form-field form-field-wide">
          <label htmlFor={fid('idea')}>
            Research idea / proposal <span className="form-req">required</span>
          </label>
          <textarea
            id={fid('idea')}
            className="input"
            name="idea"
            rows={6}
            value={values.idea}
            aria-invalid={err('idea') ? true : undefined}
            aria-describedby={describedBy('idea', fid('idea-hint'))}
            placeholder="What question would you like to answer, and why does it matter?"
            onChange={(e: { target: { value: string } }) => set('idea', e.target.value)}
          />
          <p className="form-hint" id={fid('idea-hint')}>
            A short paragraph is enough — the question, roughly who or what it would study, and
            what made you think of it.
          </p>
          {err('idea') ? (
            <p className="form-error" id={fid('idea-error')}>
              <Icon name="warning" size={12} />
              {err('idea')}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label htmlFor={fid('area')}>
            Area of interest <span className="form-req">required</span>
          </label>
          <select
            id={fid('area')}
            className="input"
            name="area"
            value={values.area}
            aria-invalid={err('area') ? true : undefined}
            aria-describedby={describedBy('area')}
            onChange={(e: { target: { value: string } }) => set('area', e.target.value)}
          >
            <option value="">Choose an area…</option>
            {cfg.areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {err('area') ? (
            <p className="form-error" id={fid('area-error')}>
              <Icon name="warning" size={12} />
              {err('area')}
            </p>
          ) : null}
        </div>

        <fieldset className="form-field form-fieldset" aria-describedby={describedBy('experience')}>
          <legend>
            Have you previously participated in research? <span className="form-req">required</span>
          </legend>
          <div className="form-radios" id={fid('experience')} tabIndex={-1}>
            {cfg.experienceOptions.map((o, i) => (
              <label key={o} className="form-radio" htmlFor={fid(`experience-${i}`)}>
                <input
                  id={fid(`experience-${i}`)}
                  type="radio"
                  name={fid('experience-group')}
                  value={o}
                  checked={values.experience === o}
                  onChange={() => set('experience', o)}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {err('experience') ? (
            <p className="form-error" id={fid('experience-error')}>
              <Icon name="warning" size={12} />
              {err('experience')}
            </p>
          ) : null}
        </fieldset>

        <div className="form-field form-field-wide">
          <label htmlFor={fid('extra')}>
            Additional information <span className="form-optional">optional</span>
          </label>
          <textarea
            id={fid('extra')}
            className="input"
            name="extra"
            rows={4}
            value={values.extra}
            placeholder="Anything else the team should know — a supervisor you have spoken to, work already done, your year of study."
            onChange={(e: { target: { value: string } }) => set('extra', e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : cfg.submitLabel}
            <Icon name="arrow-right" size={14} className="arrow" />
          </button>
          {showErrors && Object.keys(errors).length ? (
            <p className="form-error" role="alert">
              <Icon name="warning" size={12} />
              Please check the highlighted fields.
            </p>
          ) : null}
        </div>

        <p className="form-note form-field-wide">{cfg.disclaimer}</p>
      </form>
    </section>
  );
};
