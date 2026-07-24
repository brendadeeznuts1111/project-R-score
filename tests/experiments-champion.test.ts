// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { evaluateShadow, shadowLog } from '../lib/experiments/champion-challenger.ts';

describe('champion-challenger shadow', () => {
  test('challenger lower MAE triggers operational promote', () => {
    const db = new Database(':memory:');
    for (let i = 0; i < 10; i++) {
      shadowLog(db, {
        championModel: 'naive',
        challengerModel: 'rf',
        championPred: 12, // error 2
        challengerPred: 10.5, // error 0.5
        actual: 10,
      });
    }
    const go = evaluateShadow(db, { minN: 10, margin: 1.0 });
    expect(go.championMae).toBe(2);
    expect(go.challengerMae).toBe(0.5);
    expect(go.maeImprovement).toBe(1.5);
    expect(go.recommendPromote).toBe(true);
    expect(go.note).toMatch(/Operational promote/);
    expect(go.note).not.toMatch(/p-value/i);
    db.close();
  });

  test('holds champion when n below threshold', () => {
    const db = new Database(':memory:');
    for (let i = 0; i < 3; i++) {
      shadowLog(db, {
        championModel: 'naive',
        challengerModel: 'rf',
        championPred: 12,
        challengerPred: 10,
        actual: 10,
      });
    }
    const hold = evaluateShadow(db, { minN: 10, margin: 0.5 });
    expect(hold.recommendPromote).toBe(false);
    expect(hold.note).toMatch(/Hold champion/);
    db.close();
  });
});
