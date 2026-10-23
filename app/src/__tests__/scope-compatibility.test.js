import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, afterEach } from 'vitest';
import { createTestGame } from './helpers.js';
import { computeMonthlyIncome, computeMonthlyExpense } from '@ironfist/engine/economy.js';
import { tickSettlement } from '@ironfist/engine/tick/settlement.js';
import { sanitizeOffer } from '@ironfist/engine/contracts/negotiation.js';
import { INVESTMENTS } from '@ironfist/engine/data/investments.js';
import { setRNG, resetRNG } from '@ironfist/engine/rng.js';
import Finance from '../ui/Finance.jsx';
afterEach(resetRNG);
it('honours old shares once and shows them in the same expense preview as settlement', () => {
  const g=createTestGame({week:4,cash:1000000,investors:[{equity:5}]});
  g.roster[0].contract={managerCut:0.18,fightsLeft:4,durationMo:24,equity:10};
  const income=computeMonthlyIncome(g), expense=computeMonthlyExpense(g);
  expect(expense.revenueShares).toBe(Math.round((income.sponsorAmt+income.fSponsor)*0.10)+Math.round((income.sponsorAmt+income.fSponsor)*0.05));
  const before=g.cash;setRNG(()=>0.99);tickSettlement(g);
  expect(g.cash-before).toBe(income.total-expense.total);
  const html=renderToStaticMarkup(React.createElement(Finance,{g}));
  expect(html).toContain('Bagi hasil kontrak lama');
  expect(html).not.toContain('DEBUG');
});
it('stops new equity and cosmetic museum purchases while leaving saved ownership alone', () => {
  const g=createTestGame();g.investments={legacyMuseum:true};
  expect(sanitizeOffer(g.roster[0],'sign',{equity:20}).equity).toBe(0);
  expect(INVESTMENTS.some(inv=>inv.id==='legacyMuseum')).toBe(false);
  expect(g.investments.legacyMuseum).toBe(true);
});
