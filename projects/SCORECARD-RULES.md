# Game scorecard rules contract

This document is the human-readable scoring baseline for the six static scorecards in this directory. The game-specific `*-rules.js` files and their Node tests are the executable contract. Shared infrastructure may be generalized; scoring interpretation remains isolated by game.

Ruleset versions describe scoring meaning. Schema versions describe stored state shape. Existing `localStorage` keys remain permanent and are not renamed when either version changes.

## Flexible Cards

- **Intended ruleset:** User-configurable scorekeeping rather than one authoritative card-game ruleset.
- **Scoring constants:** None imposed beyond the selected preset. Entries may be positive, zero, or negative.
- **Winner:** Highest total or lowest total, according to the selected mode. Equal best totals remain tied.
- **End condition:** A configured score limit, a configured round limit, or unlimited play. Presets continue to supply their existing limits and directions.
- **Deliberate variants:** Every generic configuration is a user-selected house ruleset. Dealer rotation and preset-specific statistics do not change scoring.
- **Reference basis:** The user's selected game or house rules; the scorecard does not claim a universal authority.
- **Implementation interpretation:** In unlimited mode the page shows the current leader but does not declare a limit-based winner. Existing score-limit behavior is preserved.
- **Current ruleset version:** 1. Schema version 4.

## Pinochle

- **Intended ruleset:** Single-deck Pinochle using 1/10 scoring.
- **Scoring constants:** Exactly 25 trick points are distributed each hand. The default target is 150.
- **Hand scoring:** A bidder who makes the bid scores meld plus trick points. A bidder who fails scores the negative bid. Any side with zero trick points loses its meld. Existing shutout behavior remains: when one side takes all 25 trick points, only that side retains meld.
- **Winner:** If one participant reaches the target after a hand, that participant wins. If several reach it on the same hand, a successful high bidder among them has precedence. Otherwise the highest resulting score among target-reaching participants wins; an equal score remains tied.
- **End condition:** Completion of a hand where at least one participant reaches the configured target.
- **Deliberate variants:** The page supports two or three independently scored participants or teams while retaining the established single-deck scoring semantics.
- **Reference basis:** [Pagat single-deck Pinochle](https://www.pagat.com/marriage/pinmain.html) for 250 total counter points, set-bid scoring, and the common divide-by-ten convention; the adopted 1/10 presentation therefore uses 25 trick points. The same-hand bidder-precedence interpretation is recorded explicitly here because Pinochle practices vary.
- **Implementation interpretation:** Stored arrays retain the legacy `tricks` field name for compatibility, while the UI says “Trick Points.” Corrected winner selection may change the displayed winner of a historical match where multiple participants crossed the target together; the stored hand scores are not rewritten.
- **Current ruleset version:** 1. Schema version 3.

## Canasta

- **Intended ruleset:** Classic-style Canasta scoring.
- **Scoring constants:** Natural Canasta +500; Mixed Canasta +300; Going Out +100; Concealed Out an additional +100; Red 3s +100 each or +800 for all four; Red 3 values are negative when the side has no meld. The default target is 5,000.
- **Winner:** The highest-scoring side among those at or above the target. Equal best totals remain tied.
- **End condition:** Completion of a round where at least one side reaches the configured target.
- **Deliberate house/variant rule:** A Wild Canasta is allowed and scores exactly +1,000.
- **Reference basis:** [Pagat's Canasta rules and variations](https://www.pagat.com/rummy/canasta.html) for classic-style scoring concepts, with the Wild Canasta value treated as this scorecard's explicit variant.
- **Implementation interpretation:** Initial meld thresholds are 15 below zero, 50 from 0–1,499, 90 from 1,500–2,999, and 120 from 3,000 upward.
- **Current ruleset version:** 1. Schema version 2.

## Hand & Foot

- **Intended ruleset:** Primarily Hand & Foot Remastered Singles conventions for 2–8 individually scored players over four rounds.
- **Scoring constants:** Meld requirements are 60, 90, 120, and 150. Perfect Deal +100; Going Out +100; each Red 3 +100; Clean Book +700; Dirty Book +300; signed Card Total; four cumulative rounds.
- **Winner:** Highest cumulative total after four rounds. Equal totals remain tied.
- **End condition:** The four-round scorecard is complete after round 4; a partially played scorecard may still be archived deliberately.
- **Deliberate default house rule:** **Wild Books are allowed in singles and score exactly 1,500 points.** Users do not opt into this rule.
- **Reference basis:** [Gray Dog Games' Singles instructions](https://www.graydoggames.com/en-ca/pages/hand-foot-remastered-singles-play-instructions) for player range, four rounds, meld requirements, and standard bonuses; [Gray Dog's optional alternate rules](https://www.graydoggames.com/pages/hand-foot-remastered-optional-alternate-rules) identifies Wild Books in singles as a house-rule option.
- **Implementation interpretation:** Legacy Black 3 counts from schema 1 are converted into the signed card total at -100 each. Existing archived team records retain their legacy team identity and score interpretation.
- **Current ruleset version:** 1. Schema version 3.

## Skyjo

- **Intended ruleset:** Official standard Skyjo scoring for new games.
- **Scoring constants:** Entered raw round scores are accumulated. When another player has an equal or lower score than the closer, a positive closer score doubles under standard rules. A closer score of zero or below never doubles. The default end threshold is 100.
- **Winner:** Lowest cumulative total when the end threshold is reached. Equal lowest totals remain tied.
- **End condition:** After a completed round, the game ends when any participant's cumulative total is at or above the configured threshold.
- **House-rule option:** **Safe ties / ties count as lowest.** When enabled, a positive closer score doubles only if another player is strictly lower.
- **Reference basis:** The [English Magilano rulebook](https://www.philibertnet.com/en/product/attachment/5943) for standard closing-player scoring; the scorecard's safe-ties behavior is expressly a house rule.
- **Implementation interpretation:** New games use ruleset version 2 and default `safeTies` to false. A legacy state without ruleset metadata keeps the earlier safe-ties interpretation, including when the field was absent. Once a round exists, tie handling is locked for that game.
- **Current ruleset version:** 2 for official-default games; legacy safe-ties interpretation is version 1. Schema version 2.

## Qwirkle

- **Intended ruleset:** Official standard Qwirkle scoring for 2–4 players.
- **Scoring constants:** Normal entered turn scores are summed. A Qwirkle is 6 line points plus a 6-point Qwirkle bonus. The player who uses the last tile after the bag is empty receives +6.
- **Winner:** Highest final total. Equal highest totals remain tied.
- **End condition:** The first player to use the last tile after the bag is empty ends the game.
- **Deliberate variants:** None in scoring. The expandable 15-row turn grid is only a score-entry convenience.
- **Reference basis:** [MindWare's Qwirkle instructions](https://www.mindware.orientaltrading.com/pdf/instructions/32016.pdf).
- **Implementation interpretation:** A null finishing player remains null through normalization and awards no bonus. Player index 0 receives +6 only when the stored value explicitly identifies index 0.
- **Current ruleset version:** 1. Schema version 2.
