// The Grand Tour (bonus round): a self-running, captioned walkthrough of the functional NPCs for demos.
// Pure script + runner. The app supplies `api`; nothing here touches the DOM or storage directly.
//
// api: {caption(step, index, total), talkTo(id), talkingTo() → id|null, send(text), ready() → bool,
//       wait(ms) → Promise (resolves early on "Next"), cancelled() → bool, finish()}

export const TOUR = [
  {title: 'The Grand Tour', caption: 'Five members of staff explain the offers in-world. Every fact comes from data, every offer carries its terms, and a wellbeing check runs before each reply. Nothing on this tour is saved.', dwell: 6500},
  {npc: 100, title: 'Mr Penrose · terms', caption: 'He finds the clause and quotes it word for word, with its version date and a link. He never says how it applies to you.', say: ['What’s the wagering on free spins?']},
  {npc: 101, title: 'Celeste · bonuses', caption: 'Only offers open to you, each card with wagering, expiry, max win and its terms. She won’t call any of them “best”, and she brings offers up unprompted once a session at most.', say: ['Any bonuses?']},
  {npc: 104, title: 'Hollis · banking', caption: 'Read-only facts from data. Never a deposit prompt. “Set a limit” opens a real daily loss limit.', say: ['How long do withdrawals take?', 'Set a limit']},
  {npc: 102, title: 'Pip · free spins', caption: 'Spins open only on the games they cover. Ask for the wrong cabinet and the refusal comes from the offer’s own data.', say: ['What spins have I got?', 'Use my nova spins on grand sevens']},
  {npc: 103, title: 'Rex · competitions', caption: 'Live first, countdowns on the cards only. Your standing is a number, never a nudge.', say: ['What’s on?', 'Who won last week?']},
  {npc: 103, title: 'The wellbeing check', caption: 'One sign of distress and offers switch off for the rest of the session, with safer-play tools on screen. Records and terms stay available.', say: ['I need to win my money back', 'What’s on?']},
  {npc: 0, title: 'And Sofia', caption: 'The hotel’s resident flirt. By design she never sells anything. She has opinions instead.', say: ['What do you think of Mr Penrose?']},
  {title: 'That’s the tour', caption: 'Nothing was saved. Exit to start your own stay at The Grand.', end: true},
];

const STEP_MS = 4200;

// Run the tour. Resolves 'done' or 'cancelled'.
export async function runTour(api, steps = TOUR) {
  const total = steps.length;
  const until = async (test, ms) => { for (let t = 0; t < ms; t += 200) { if (api.cancelled()) return false; if (test()) return true; await api.wait(200, true); } return test(); };
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (api.cancelled()) return 'cancelled';
    api.caption(step, i, total);
    if (step.end) { api.finish(); return 'done'; }
    if (step.npc !== undefined) {
      if (api.talkingTo() !== step.npc) {
        api.talkTo(step.npc);
        if (!(await until(() => api.talkingTo() === step.npc && api.ready(), 20000))) continue;
        await api.wait(1400, true);
      }
      for (const line of step.say || []) {
        if (api.cancelled()) return 'cancelled';
        await until(() => api.ready(), 6000);
        api.send(line);
        await api.wait(step.dwell || STEP_MS);
      }
    } else await api.wait(step.dwell || STEP_MS);
  }
  api.finish();
  return 'done';
}
