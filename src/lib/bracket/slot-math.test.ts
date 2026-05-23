import { describe, it, expect } from "vitest";
import {
  bracketShape,
  advanceSlot,
  bestOfThreeWinner,
  semifinalRound,
  r1PairToR2,
} from "./slot-math";

describe("bracketShape", () => {
  it("rejects fewer than 2 participants", () => {
    expect(() => bracketShape(1)).toThrow();
  });

  it.each([
    [2, { rounds: 1, firstRoundSize: 2, byes: 0, r1Matches: 1, totalMatches: 1 }],
    [3, { rounds: 2, firstRoundSize: 4, byes: 1, r1Matches: 1, totalMatches: 2 }],
    [4, { rounds: 2, firstRoundSize: 4, byes: 0, r1Matches: 2, totalMatches: 3 }],
    [5, { rounds: 3, firstRoundSize: 8, byes: 3, r1Matches: 1, totalMatches: 4 }],
    [6, { rounds: 3, firstRoundSize: 8, byes: 2, r1Matches: 2, totalMatches: 5 }],
    [7, { rounds: 3, firstRoundSize: 8, byes: 1, r1Matches: 3, totalMatches: 6 }],
    [8, { rounds: 3, firstRoundSize: 8, byes: 0, r1Matches: 4, totalMatches: 7 }],
    [9, { rounds: 4, firstRoundSize: 16, byes: 7, r1Matches: 1, totalMatches: 8 }],
    [16, { rounds: 4, firstRoundSize: 16, byes: 0, r1Matches: 8, totalMatches: 15 }],
  ])("shape for %i participants", (n, expected) => {
    const s = bracketShape(n);
    expect(s).toMatchObject(expected);
  });

  it("totalMatches equals n - 1 for every n in [2..32]", () => {
    for (let n = 2; n <= 32; n++) {
      expect(bracketShape(n).totalMatches).toBe(n - 1);
    }
  });

  it("matchesPerRound sums to totalMatches", () => {
    for (let n = 2; n <= 32; n++) {
      const s = bracketShape(n);
      const sum = s.matchesPerRound.reduce((a, b) => a + b, 0);
      expect(sum).toBe(s.totalMatches);
    }
  });

  it("R1 slot range is byes+1..firstRoundSize/2 and slot count matches r1Matches", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
      const s = bracketShape(n);
      const r1SlotCount = s.firstRoundSize / 2 - s.byes;
      expect(r1SlotCount).toBe(s.r1Matches);
    }
  });
});

describe("advanceSlot", () => {
  it("R1 slot 1 → R2 slot 1, participant slot 1", () => {
    expect(advanceSlot(1, 1)).toEqual({ nextRound: 2, nextSlot: 1, nextParticipantSlot: 1 });
  });
  it("R1 slot 4 (n=5 case) → R2 slot 2, participant slot 2", () => {
    expect(advanceSlot(1, 4)).toEqual({ nextRound: 2, nextSlot: 2, nextParticipantSlot: 2 });
  });
  it("R1 slot 3 → R2 slot 2, participant slot 1", () => {
    expect(advanceSlot(1, 3)).toEqual({ nextRound: 2, nextSlot: 2, nextParticipantSlot: 1 });
  });
});

describe("r1PairToR2", () => {
  it.each([
    [1, { r2Slot: 1, r2ParticipantSlot: 1 }],
    [2, { r2Slot: 1, r2ParticipantSlot: 2 }],
    [3, { r2Slot: 2, r2ParticipantSlot: 1 }],
    [4, { r2Slot: 2, r2ParticipantSlot: 2 }],
    [5, { r2Slot: 3, r2ParticipantSlot: 1 }],
  ])("pair %i", (pair, expected) => {
    expect(r1PairToR2(pair)).toEqual(expected);
  });
});

describe("semifinalRound", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 4],
  ])("rounds=%i → SF round=%i", (rounds, expected) => {
    expect(semifinalRound(rounds)).toBe(expected);
  });
});

describe("bestOfThreeWinner", () => {
  it("returns null when undecided", () => {
    expect(bestOfThreeWinner([])).toBeNull();
    expect(bestOfThreeWinner([{ slot1: 21, slot2: 18 }])).toBeNull();
  });
  it("returns 1 when slot1 wins 2 sets", () => {
    expect(
      bestOfThreeWinner([
        { slot1: 21, slot2: 18 },
        { slot1: 21, slot2: 15 },
      ]),
    ).toBe(1);
  });
  it("returns 2 when slot2 wins 2 sets after losing first", () => {
    expect(
      bestOfThreeWinner([
        { slot1: 21, slot2: 18 },
        { slot1: 17, slot2: 21 },
        { slot1: 19, slot2: 21 },
      ]),
    ).toBe(2);
  });
  it("ignores extra sets after a winner is decided", () => {
    expect(
      bestOfThreeWinner([
        { slot1: 21, slot2: 10 },
        { slot1: 21, slot2: 10 },
        { slot1: 0, slot2: 21 },
      ]),
    ).toBe(1);
  });
});
