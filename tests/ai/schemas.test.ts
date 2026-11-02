import { describe, expect, it } from 'vitest';

import { buildMatchSummaryInput } from '@/lib/ai/prompts/match-summary';
import { buildScoutingReportInput, SCOUTING_REPORT_SYSTEM } from '@/lib/ai/prompts/scouting-report';
import { matchSummarySchema, scoutingReportSchema } from '@/lib/ai/schemas';
import { Side } from '@/lib/domain/enums';
import { computeHeadToHead, computeMatchStats, type StatPoint } from '@/lib/domain/stats';

const recordedScoutingReport = {
  headline: 'Fix your receive and this match opens up',
  keyPatterns: [
    {
      title: 'Receive errors',
      evidence: '34% of your lost points are receive errors',
      impact: 'You give away points before the rally starts.',
    },
  ],
  gamePlan: [{ tactic: 'Push the pendulum serve long to the backhand', why: 'It takes away the third-ball loop.' }],
  serveReceivePlan: 'Stand closer and read the wrist on contact.',
  mentalNote: 'At 10-10, use your safest serve.',
  confidence: 'medium',
};

const recordedMatchSummary = {
  headline: 'You came back by holding your serve',
  turningPoint: 'The biggest swing came in game 3.',
  whatWorked: ['Winning 61% on your serve'],
  whatToFix: ['Winning 39% on their serve'],
};

describe('scoutingReportSchema', () => {
  it('accepts a recorded response', () => {
    expect(scoutingReportSchema.parse(recordedScoutingReport).confidence).toBe('medium');
  });

  it.each([
    ['missing game plan', { ...recordedScoutingReport, gamePlan: undefined }],
    ['empty game plan', { ...recordedScoutingReport, gamePlan: [] }],
    ['blank headline', { ...recordedScoutingReport, headline: '   ' }],
    ['unknown confidence', { ...recordedScoutingReport, confidence: 'certain' }],
    ['pattern without evidence', { ...recordedScoutingReport, keyPatterns: [{ title: 'x', impact: 'y' }] }],
    ['not an object', 'I cannot help with that'],
  ])('rejects %s', (_label, response) => {
    expect(scoutingReportSchema.safeParse(response).success).toBe(false);
  });
});

describe('matchSummarySchema', () => {
  it('accepts a recorded response', () => {
    expect(matchSummarySchema.parse(recordedMatchSummary).whatWorked).toHaveLength(1);
  });

  it('rejects empty lists', () => {
    expect(matchSummarySchema.safeParse({ ...recordedMatchSummary, whatToFix: [] }).success).toBe(false);
  });
});

describe('prompt inputs', () => {
  const points: StatPoint[] = [{ winner: Side.Me, server: Side.Me, gameNumber: 1, ending: null, actor: null }];

  it('sends computed stats without the point-by-point momentum series', () => {
    const input = JSON.stringify(
      buildMatchSummaryInput({ result: 'me won', games: [], stats: computeMatchStats(points), biggestSwing: null }),
    );

    expect(input).toContain('pointsWon');
    expect(input).not.toContain('momentum');
  });

  it('has no field for player or opponent names', () => {
    const input = buildScoutingReportInput({
      headToHead: computeHeadToHead([{ winner: Side.Me, bestOf: 3, playedAt: new Date(0), points }]),
      weaknesses: [],
      confidence: 'low',
      player: { handedness: null, grip: null, playStyle: null, blade: null, forehandRubber: null, backhandRubber: null },
      opponent: {
        handedness: null,
        grip: null,
        playStyle: null,
        forehandRubberType: null,
        backhandRubberType: null,
        notes: null,
      },
    });

    expect(JSON.stringify(input)).not.toMatch(/"(name|displayName|opponentName)"/);
    expect(JSON.stringify(input)).toContain('"confidence":"low"');
  });

  it('tells the model to use only numbers from the input', () => {
    expect(SCOUTING_REPORT_SYSTEM).toContain('Use only numbers present in the input');
  });
});
