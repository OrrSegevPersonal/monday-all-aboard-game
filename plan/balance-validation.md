# Tactical difficulty validation

## Final parameters

New cruises use balance version 2. Workloads by day are **2, 2, 3, 3, 4, 5, 6, 7, 9, 10**. The requested initial curve produced roughly 55% tactical wins on tuning seeds, with insufficient late pressure. A steeper curve ending at 11 met the overall difficulty target but overemphasized Fast Track. Ending at 10 improves alternatives while keeping aggregate tactical wins below 40%.

Six daily actions, all tier prices/capacities, agent hire/upkeep costs, and daily payouts remain unchanged. Disruptions start on day 4: one through day 6, two thereafter, after turns 2 and 4. Morning Auto-assign retains the existing five-trigger cascade cap. Shops guarantee an unowned throughput offer when available.

## Measurements

Tuning used seeds 1–1000. An intermediate curve was evaluated on seeds 100001–110000. Final validation used fresh seeds **200001–210000**, 10,000 cruises for each policy. Results below were reproduced after the final turn-resumption changes. Full failure-day, upgrade, purchase, and winning-build counts are in `balance-results.json`.

| Policy | Wins / 10,000 | Rate |
|---|---:|---:|
| Manual, no rules or crew | 0 | 0% |
| Starter Auto-assign only | 0 | 0% |
| Fixed purchases and Galley assignment | 0 | 0% |
| Tactical crew / action-refund priority | 4,019 | 40.19% |
| Tactical Standup / Overtime / Crossover priority | 3,653 | 36.53% |
| Tactical crew, never buys Fast Track | 1,451 | 14.51% |

The two unrestricted tactical policies average **38.36%**, satisfying the 20–40% aggregate target. One individual policy is slightly above 40%; the target is aggregate. Manual and starter-only policies satisfy the ≤1% ceiling. These are reproducible heuristic simulations, not an optimal solver or a prediction of human win rates.

Manual losses: 1,466 on day 1 and 8,534 on day 3. Starter-only losses: 6,644 on day 4 and 3,356 on day 5. With six base actions and growing three-step mandatory work, a manual victory is structurally unavailable rather than assigned a secret lucky seed.

For the crew policy, failures are concentrated on days 4–5 (1,285 and 3,096), with additional late failures on days 8–10 (263, 601, 370). Pro is purchased primarily before day 5 (4,211 cruises), then before day 4 (1,905); Enterprise is reached mostly before day 10 (1,096). This makes the first hiring decision and late expansion consequential.

## Build diversity and policy definitions

- Both tactical policies save for Pro plus a hire, fill agent capacity, assign departments by tomorrow's work demand, prioritize work outside staffed departments, finish urgent work for refunds, and protect near-complete Galley tasks before inspection. They end early when a looming event would waste resources.
- Crew prioritizes Fast Track and Stuck → Alert and hires Escalation Manager before Sign-off Specialist. Rules prioritizes Standup, Overtime, and Crossover and reverses those first two hires. Neither policy sees future RNG rolls or changes parameters by seed.
- Fixed play upgrades whenever possible, hires the Coordinator into Galley, buys the first offer, and processes board order without reading forecasts.
- In the crew policy, the Crossover + Fast Track + Overtime + Standup build (plus starter) accounts for 1,899 wins. Replacing Crossover with Stuck → Alert accounts for 1,018. These provide different sources of additional throughput.
- Fast Track remains strong, but excluding it still yields 1,451 victories. Those wins include 722 with Alert + Crossover + Overtime + Standup and 341 with Alert + Bonus + Overtime + Standup (plus starter). No particular shop purchase is an absolute requirement for victory.
- All offers still cost coins. Guaranteed throughput prevents a shop consisting only of score rules, but does not guarantee the player's preferred or affordable rule. Shop and task luck remain roguelike factors.

## Reproduce

```sh
node scripts/balance.mjs manual 10000 200001
node scripts/balance.mjs starter 10000 200001
node scripts/balance.mjs fixed 10000 200001
node scripts/balance.mjs crew 10000 200001
node scripts/balance.mjs rules 10000 200001
node scripts/balance.mjs crew 10000 200001 fast
npm test
```

33 engine tests cover legacy balance, full workload generation, exact preparation links, deterministic independent forecasts, all event effects, turn timing, clamping, refunds, early ending, one-time preparation consumption, and saved Stuck incidents resuming agents and cascade score/limits.

Browser verification used the isolated fixture server (`node scripts/preview.mjs`, localhost:5181) so the user's normal cruise save was untouched. Verified port forecasts, promotion to the same next-day schedule, countdowns, inspection preserving Done and resetting unfinished preparation work, all-hands reducing 6 actions to 3 after two player turns, and visible briefing skip feedback. Verified forecast layout at 390×844 and reset the viewport afterward. No browser console errors were observed. Reduced-motion styling suppresses motion while preserving event text and the activity log.
