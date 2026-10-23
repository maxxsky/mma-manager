import { it, expect } from 'vitest';
import { regularOfferTier, reputationAfterWin } from '@ironfist/engine/economy-progression.js';
import { canRecruit, affordableOperation } from '../../../tools/economy-policy.mjs';
import { createTestGame, createTestFighter } from './helpers.js';
import { reducer } from '@ironfist/engine/reducer.js';

it('requires competitive standing for Major and Premier ordinary purses', () => {
  const f = {record:{w:50}};
  expect(regularOfferTier(100,f,null)).toBe('National');
  expect(regularOfferTier(100,f,12)).toBe('Major');
  expect(regularOfferTier(100,f,5)).toBe('Premier');
  expect(regularOfferTier(100,f,0)).toBe('Premier');
  expect(regularOfferTier(8,f,1)).toBe('Local');
});
it('keeps low-tier wins useful early without letting them max camp reputation', () => {
  let rep = 8;
  for(let i=0;i<100;i++) rep = reputationAfterWin(rep,'Local',true);
  expect(rep).toBe(35);
  expect(reputationAfterWin(80,'Local',true)).toBe(80);
  expect(reputationAfterWin(95,'Premier',true)).toBe(100);
});
it('a budget-aware manager refuses extra payroll without operating reserves', () => {
  const g = createTestGame({cash:500, rep:10});
  expect(affordableOperation(g,[])).toBe(false);
  expect(canRecruit(g,createTestFighter(),[])).toBe(false);
  g.cash = 1e7; g.coaches = [];
  expect(affordableOperation(g,[])).toBe(true);
});
it('lets a struggling camp dismiss its last coach at the actual salary cost', () => {
  const g = createTestGame({cash:50000,coaches:[{id:'coach',name:'Coach',salary:5000}]});
  reducer(g,{type:'FIRE_COACH',coachId:'coach',severance:0});
  expect(g.coaches).toHaveLength(0);
  expect(g.cash).toBe(45000);
  reducer(g,{type:'FIRE_COACH',coachId:'missing',severance:-10000});
  expect(g.cash).toBe(45000);
});
