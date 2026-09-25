# Implementation verification

Validated with Node.js 22 and the Codex in-app browser.

- `npm test`: 23 passing engine tests, including 100 seeded ten-day simulations using primary-first decisions, preparation, a hired agent and sequential tier upgrades.
- Browser: completed three workdays, reached the shop, upgraded to Pro, hired The Coordinator, assigned Deck expertise, bought Room Service, reordered and toggled it, and searched owned automations.
- Browser: a player completion in Galley triggered The Coordinator's separate Deck completion; both mandatory orders completed for one player action and the log recorded the agent attribution.
- Reload: Pro, coins, hired crew, assigned department, prepared work, and RNG-driven offers survived reload.
- Visual inspection: board groups/status cells, automation recipes and tier locks, portrait roster/detail panel, and shop upgrade cards use the supplied reference language.
- Mobile: checked a 390px viewport. Document width remained 390px; the 855px table scrolls within the board container. Mobile navigation remains visible.
- No browser console errors or warnings were observed during the checked flows.

Simulation checks establish deterministic mechanics and attainable upgrades; they do not replace human playtesting of difficulty, pacing or combo appeal. Online scores and endless play are outside this implementation.
