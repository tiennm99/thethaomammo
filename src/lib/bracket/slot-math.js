/**
 * Single-elimination bracket math (pure, side-effect-free).
 * Mirrors the SQL logic in 000013/000014 — must stay in sync.
 *
 * Conventions (no bye-vs-bye matches):
 * - Logical positions 1..firstRoundSize. Byes occupy odd positions
 *   1, 3, 5, ..., (2*byes - 1) so every bye pairs with a real player.
 * - R1 pairs span (2S-1, 2S). Pair S <= byes is (bye, real); the real
 *   player is hard-placed directly into R2 at gen time. Pair S > byes
 *   is (real, real) → an R1 match record exists at slot=S.
 * - R1 slot numbering: byes+1..firstRoundSize/2. Other rounds: 1..2^(rounds-r).
 * - Winner of (R, K) advances to (R+1, ceil(K/2)) at participant ((K-1)%2)+1.
 * - Total matches = n - 1 (single-elim invariant).
 */

/**
 * @typedef {{
 *   participants: number,
 *   rounds: number,
 *   firstRoundSize: number,
 *   byes: number,
 *   r1Matches: number,
 *   totalMatches: number,
 *   matchesPerRound: number[],
 * }} BracketShape
 */

/**
 * @param {number} participants
 * @returns {BracketShape}
 */
export function bracketShape(participants) {
  if (participants < 2) {
    throw new Error("bracket requires at least 2 participants");
  }
  const rounds = Math.max(1, Math.ceil(Math.log2(participants)));
  const firstRoundSize = 1 << rounds;
  const byes = firstRoundSize - participants;
  const r1Matches = participants - firstRoundSize / 2;
  /** @type {number[]} */
  const matchesPerRound = [r1Matches];
  for (let r = 2; r <= rounds; r++) {
    matchesPerRound.push(firstRoundSize / (1 << r));
  }
  const totalMatches = participants - 1;
  return {
    participants,
    rounds,
    firstRoundSize,
    byes,
    r1Matches,
    totalMatches,
    matchesPerRound,
  };
}

/**
 * Where does the winner of (round R, slot K) go in round R+1?
 * @param {number} round
 * @param {number} slot
 */
export function advanceSlot(round, slot) {
  return {
    nextRound: round + 1,
    nextSlot: Math.ceil(slot / 2),
    nextParticipantSlot: /** @type {1 | 2} */ (((slot - 1) % 2) + 1),
  };
}

/**
 * Round index where semifinals live (rounds - 1, min 1).
 * @param {number} rounds
 */
export function semifinalRound(rounds) {
  return Math.max(1, rounds - 1);
}

/**
 * Best-of-3 winner from a list of (slot1Score, slot2Score) sets.
 * @param {ReadonlyArray<{ slot1: number, slot2: number }>} sets
 * @returns {1 | 2 | null}
 */
export function bestOfThreeWinner(sets) {
  let w1 = 0;
  let w2 = 0;
  for (const s of sets) {
    if (s.slot1 > s.slot2) w1++;
    else if (s.slot2 > s.slot1) w2++;
    if (w1 >= 2) return 1;
    if (w2 >= 2) return 2;
  }
  return null;
}

/**
 * For an R1 pair index S in 1..firstRoundSize/2, compute where the
 * participant lands in R2 — useful for the SQL placement reasoning.
 * Returns (r2Slot, r2ParticipantSlot).
 * @param {number} pairSlot
 */
export function r1PairToR2(pairSlot) {
  return {
    r2Slot: Math.ceil(pairSlot / 2),
    r2ParticipantSlot: /** @type {1 | 2} */ (((pairSlot - 1) % 2) + 1),
  };
}
