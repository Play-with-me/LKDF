import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STANDARD_DECK_TEMPLATES } from '@lkdf/shared';
import { PlayingCardFace } from './src/features/match/HandCardItem';

export function renderDemoCard(element, key, name, printing, sourceKey = key) {
  const template = STANDARD_DECK_TEMPLATES.find(card => card.cardKey === sourceKey);
  const face = STANDARD_DECK_TEMPLATES.find(card => card.cardKey === key);
  if (!template || !face) return;

  element.classList.add('lkdf-card-gwent', 'demo-card-face');
  element.innerHTML = renderToStaticMarkup(
    <PlayingCardFace card={{
      ...face,
      id: 'motion-preview',
      nameVi: name,
      suit: printing?.suit ?? template.suit,
      rank: printing?.rank ?? template.rank,
    }} />,
  );
}
