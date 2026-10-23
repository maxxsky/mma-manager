import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, afterEach, vi } from 'vitest';
import { localizeText } from '../i18n/text.js';
import { localizeTree } from '../i18n/presentation.jsx';
import { MESSAGE_PAIRS } from '../i18n/messages-id.js';
import WorldNews from '../ui/WorldNews.jsx';
import Achievements from '../ui/Achievements.jsx';
import Roster from '../ui/Roster.jsx';
import { createTestGame } from './helpers.js';
import { genFighter } from '@ironfist/engine/fighter.js';
import { runFight, prepFighter, autoGamePlan } from '@ironfist/engine/fight.js';
import { mulberry32, setRNG, resetRNG } from '@ironfist/engine/rng.js';
afterEach(() => { resetRNG(); vi.unstubAllGlobals(); });

it('localizes existing save messages and achievement descriptions without mutating state', () => {
  const g = {inbox:[{id:1,type:'world',title:'👑 New Lightweight Champion!',body:'José defeats A. Santoso to become the new Lightweight champion!'}],_unlocked:['five_wins']};
  const before=JSON.stringify(g);
  const world=renderToStaticMarkup(React.createElement(WorldNews,{g}));
  const badges=renderToStaticMarkup(React.createElement(Achievements,{g}));
  expect(world).toContain('Juara Baru Lightweight');
  expect(world).toContain('José mengalahkan A. Santoso');
  expect(badges).toContain('Raih total 5 kemenangan');
  expect(JSON.stringify(g)).toBe(before);
});
it('preserves interpolated names, timestamps, scores, IDs and event handlers', () => {
  expect(localizeText('[1:09] First Blood lands 12 strikes — New Champion answers with 8.'))
    .toBe('[1:09] First Blood mendaratkan 12 serangan — New Champion membalas 8.');
  const onClick=()=>{};
  const original=React.createElement('button',{value:'First Blood',onClick,'data-id':'champion'},'Five Wins');
  const result=localizeTree(original);
  expect(result.props.children).toBe('Lima Kemenangan');
  expect(result.props.value).toBe('First Blood');
  expect(result.props['data-id']).toBe('champion');
  expect(result.props.onClick).toBe(onClick);
  expect(original.props.children).toBe('Five Wins');
});
it('preserves a displayed fighter name even when it equals a translated achievement', () => {
  vi.stubGlobal('window',{innerWidth:1280});
  const g=createTestGame();g.roster[0].name='Five Wins';
  const html=renderToStaticMarkup(React.createElement(Roster,{g,dispatch:()=>{},setTab:()=>{}}));
  expect(html).toContain('translate="no">Five Wins');
  expect(html).not.toContain('Lima Kemenangan');
});
it('keeps every template well-formed with all values used by the translation present in the source', () => {
  expect(MESSAGE_PAIRS.length).toBeGreaterThan(400);
  for(const [source,translated] of MESSAGE_PAIRS){
    expect(source).toBeTruthy(); expect(translated).toBeTruthy();
    const ids=new Set(source.match(/\{\d+\}/g)||[]);
    for(const id of translated.match(/\{\d+\}/g)||[]) expect(ids.has(id)).toBe(true);
  }
});
it('localizes real summary and tick commentary across plans/corners without rewriting fight evidence', () => {
  for(let seed=0;seed<50;seed++){
    setRNG(mulberry32(seed));const a=genFighter(1),b=genFighter(1);
    const result=runFight(prepFighter(a),prepFighter(b),autoGamePlan(a,b),()=>['neutral','go','save','body','target_cut','stop_bleed','clinch','empty_tank'][seed%8],seed,5);
    const before=JSON.stringify(result);
    for(const round of result.roundLogs)for(const line of [...round.log,...round.tickLog]){
      expect(localizeText(line),line).not.toBe(line);
      const text=localizeText(line).replaceAll(a.name,'').replaceAll(b.name,'');
      expect(text).not.toMatch(/\b(defends|shoots|lands|getting tight|Good attempt|breathing hard|Round|corner wants)\b/);
    }
    expect(JSON.stringify(result)).toBe(before);
  }
});
