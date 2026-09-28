/* ==========================================================================
   CIG — Rhythm recognition quiz
   --------------------------------------------------------------------------
   The same challenge model the examination module uses, applied to the
   monitor: a question from content/exam/challenges.json, the distractors it
   names, and — once answered — the monitor switched to the correct rhythm so
   the learner can see what they should have recognised.

   Questions are data, so CIG can add a whole examination paper without
   touching this component.
   ========================================================================== */

import { useMemo, useState } from 'react';
import { Icon } from '../icons/Icon';
import { challengesFor, ecgRhythmById } from '../../lib/content';

export const RhythmQuiz = ({
  onReveal,
}: {
  /** Switches the monitor to a rhythm, so the answer can be seen. */
  onReveal: (rhythmId: string) => void;
}) => {
  const questions = useMemo(() => challengesFor('rhythm'), []);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });

  if (!questions.length) return null;
  const q = questions[index % questions.length];
  const options = q.options ?? [q.targetId];
  const answered = answer !== null;
  const correct = answer === q.targetId;

  const choose = (id: string) => {
    if (answered) return;
    setAnswer(id);
    setScore((s) => ({ right: s.right + (id === q.targetId ? 1 : 0), asked: s.asked + 1 }));
    onReveal(q.targetId);
  };

  return (
    <section className="quiz" aria-label="Rhythm recognition quiz">
      <header className="quiz-head">
        <div>
          <span className="eyebrow eyebrow-crimson">Test yourself</span>
          <h3>Rhythm recognition</h3>
        </div>
        {score.asked > 0 ? (
          <span className="quiz-score mono">
            {score.right} / {score.asked}
          </span>
        ) : null}
      </header>

      <p className="quiz-prompt">{q.prompt}</p>

      <div className="quiz-options" role="group" aria-label="Answers">
        {options.map((id) => {
          const rhythm = ecgRhythmById.get(id);
          if (!rhythm) return null;
          const state = !answered
            ? ''
            : id === q.targetId
              ? ' is-right'
              : id === answer
                ? ' is-wrong'
                : ' is-dim';
          return (
            <button
              key={id}
              type="button"
              className={'quiz-option' + state}
              onClick={() => choose(id)}
              disabled={answered}
            >
              {answered && id === q.targetId ? <Icon name="check" size={13} /> : null}
              {answered && id === answer && id !== q.targetId ? (
                <Icon name="close" size={13} />
              ) : null}
              {rhythm.name}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className={'quiz-feedback' + (correct ? ' is-ok' : ' is-bad')}>
          <p>
            <strong>{correct ? 'Correct.' : 'Not quite.'}</strong>{' '}
            {correct ? q.successText.replace(/^Correct — /, '') : q.failText}
          </p>
          <p className="quiz-shown">
            The monitor above is now showing {ecgRhythmById.get(q.targetId)?.name}.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setAnswer(null);
              setIndex((i) => (i + 1) % questions.length);
            }}
          >
            Next question
            <Icon name="arrow-right" size={13} />
          </button>
        </div>
      ) : (
        <p className="quiz-hint">
          <Icon name="lightbulb" size={13} />
          {q.hint}
        </p>
      )}
    </section>
  );
};
