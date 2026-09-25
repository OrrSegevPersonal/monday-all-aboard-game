# All A Board!

A ten-day cruise operations game, played on a Monday-inspired work board. Browser-native JavaScript, with a deterministic rules engine and no install-time dependencies.

## Run

Requires Node.js 20 or later.

```sh
npm run dev
```

Open http://localhost:5173. `PORT=5174 npm run dev` selects another port. The server listens on `0.0.0.0`, including Railway's assigned port.

```sh
npm test
```

## Play

- Click a task’s status to spend one daily action. Every lane uses the same track: Pending → Working on it → In review → Done. Complete every Primary before the day ends; unfinished mandatory work ends the run.
- Some reviews become Stuck. The incident window offers a task-specific forward route: pay 3 coins for outside help or spend 2 actions to handle it in-house. Either route completes the work.
- Secondary preparations follow that same status track. Completing one carries the exact saved status into its named tomorrow Primary, shown as a “Prepared carry-over” badge; it never jumps the task to Done. Recurring tasks offer optional score.
- The starter Auto-assign moves arriving Primaries forward. Equip additional rules at port and watch their effects cascade.
- New cruises escalate from 2 to 10 mandatory Primaries: `2, 2, 3, 3, 4, 5, 6, 7, 9, 10`. Manual-only and starter-only play cannot carry the full cruise. Build throughput and assign agents using tomorrow’s department forecast.
- Disruptions begin on day 4. All-hands consumes an action, inspections reset unfinished Galley work to Pending, and departmental briefings skip matching agents’ next turns. Forecasts at port give exact timing; completing work before an inspection protects it. End a completed day early to avoid later events.
- Successful days pay 3 coins + 1 per Primary + 1 per 40 daily score. Buy Pro for 8 coins, then Enterprise for another 16. These reduced prices also apply to future purchases in existing saves; earlier purchases are not refunded.
- Agents cost 5 coins to hire and 1 coin per successful day. Assign their department in the crew view while at port. Each acts once after every player action.
- Complete ten days to win. Boss Tasks arrive on days 3, 6, and 9. Use a numeric seed in New cruise to repeat a run’s content; identical decisions reproduce its randomness.

The board can be grouped by ETA (Primary, preparation, or recurring lane) or by department using the Group by filter in the toolbar. Status buttons expose their next step on hover, and game-over diagnostics include remaining steps and recent disruption history.

Runs save locally after each completed action, day transition, or shop change. Refresh resumes the last settled state, including the RNG position. The save is local to this browser and origin; no account or backend is required. Animation speed can be changed in the footer; system reduced-motion preferences are respected.

Existing saved cruises retain their original balance rules. Start a new cruise to use the tactical difficulty. A saved Stuck incident retains the remaining agent turns and cascade state, and its popup reopens after refresh.

Stuck interrupts play with a two-second red screen wash, task-cell shake, and “WORK STOPPED” warning before the resolution popup. Reduced-motion preferences replace movement with a static warning. Losing opens a prominent GAME OVER dialog with final statistics, unfinished work, and restart/board-inspection actions.

Balance validation: `node scripts/balance.mjs crew 10000 200001` (also `rules`, `manual`, `starter`, and `fixed`). Add `fast` as a final argument to test a policy that never buys Fast Track. See `plan/balance-validation.md` for measured results and limitations. Isolated browser fixtures run with `node scripts/preview.mjs` at port 5181; they do not change saves on the normal game origin.

## Structure

- `engine.js`: seeded content, rules, agent targeting, event resolution, economy, progression.
- `app.js`: board, automation management, shop, crew roster, target-choice dialogs, local persistence, animated event presentation.
- `style.css`: responsive reference-inspired visual system. The table scrolls horizontally on narrow screens.
- `test/engine.test.js`: rule and economy regression tests, including 100 seeded full-run simulations.
- `plan/implementation.md`: implemented design and explicit resolution rules. The original brainstorming spec remains in `plan/game-spec.md`.

Agent portraits use the supplied individual images and cropped portions of the supplied roster image. The ship reference informs copy and colors only. DM Sans is loaded when Google Fonts is available, with a local sans-serif fallback.

This implementation ends at the ten-day victory screen. Online leaderboards, accounts, and endless mode are not part of this implementation plan. Balance values are initial tuning, not conclusions from human playtesting.
