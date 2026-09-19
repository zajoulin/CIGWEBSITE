import React, { useState } from 'react';
import { Crest } from '../components/brand/Crest';
import { Icon } from '../components/icons/Icon';
import { Chip, Disclaimer } from '../components/ui/primitives';
import step1Data from '../../content/step1.json';

export const Step1Page = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredCards =
    selectedCategory === 'All'
      ? step1Data.cards
      : step1Data.cards.filter((card) => card.category === selectedCategory);

  const categories = ['All', ...Array.from(new Set(step1Data.cards.map((c) => c.category)))];
  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <>
      <header className="page-head page-head-navy stage">
        <div className="grid-bg" />
        <div className="wrap">
          <div className="page-head-row">
            <span className="crest-plate page-head-crest">
              <Crest width="100%" decorative />
            </span>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow">{step1Data.eyebrow}</span>
              <h1 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.9rem)', marginTop: 'var(--s-4)' }}>
                {step1Data.title}
              </h1>
              <p className="lede" style={{ marginTop: 'var(--s-4)', maxWidth: '74ch' }}>
                {step1Data.lede}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="section" style={{ background: 'var(--surface-1)', minHeight: '60vh' }}>
        <div className="wrap" style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Category Filter Chips */}
          <div className="tag-row" style={{ justifyContent: 'center', marginBottom: 'var(--s-6)' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '20px' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Counter Indicator */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'var(--s-3)',
              fontSize: 'var(--t-sm)',
              color: 'var(--ink-2)',
            }}
          >
            Card {currentIndex + 1} of {filteredCards.length}
          </div>

          {/* 3D Interactive Flashcard */}
          {currentCard && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              style={{
                perspective: '1000px',
                cursor: 'pointer',
                minHeight: '280px',
                width: '100%',
              }}
            >
              <div
                style={
                  {
                    position: 'relative',
                    width: '100%',
                    minHeight: '280px',
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  } as any
                }
              >
                {/* FRONT SIDE */}
                <div
                  className="card card-pad card-accent card-accent-blue"
                  style={
                    {
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      borderRadius: '16px',
                    } as any
                  }
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip tone="blue">{currentCard.category}</Chip>
                      <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Click to flip 🔄</span>
                    </div>
                    <h3 style={{ fontSize: 'var(--t-xl)', marginTop: 'var(--s-6)', lineHeight: 1.4 }}>
                      {currentCard.front}
                    </h3>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', textAlign: 'right' }}>
                    {currentCard.tag}
                  </div>
                </div>

                {/* BACK SIDE */}
                <div
                  className="card card-pad card-accent card-accent-crimson"
                  style={
                    {
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: 'var(--surface-2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      borderRadius: '16px',
                    } as any
                  }
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip tone="crimson">High-Yield Answer</Chip>
                      <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Click to flip 🔄</span>
                    </div>
                    <p
                      style={{
                        fontSize: 'var(--t-md)',
                        marginTop: 'var(--s-5)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {currentCard.back}
                    </p>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', textAlign: 'right' }}>
                    USMLE Step 1
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div
            style={
              {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'var(--s-6)',
              } as any
            }
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handlePrev}
              disabled={filteredCards.length <= 1}
            >
              ← Previous
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {isFlipped ? 'Show Question' : 'Show Answer'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleNext}
              disabled={filteredCards.length <= 1}
            >
              Next <Icon name="arrow-right" size={16} />
            </button>
          </div>

          <div style={{ marginTop: 'var(--s-10)' }}>
            <Disclaimer
              title="USMLE Step 1 Prep"
              body="These high-yield flashcards are designed for active recall and peer review."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default Step1Page;