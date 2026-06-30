// Both systems are Livewire; Alpha v3 (wire:snapshot), Bravo v2 (wire:initial-data).
export const systems = {
  alpha: {
    baseURL: 'https://bonus.chatwindow.info',
    livewire: 3,
    storageState: 'out/auth/alpha.json',
  },
  bravo: {
    baseURL: 'https://bonus.scriptfork.com',
    livewire: 2,
    storageState: 'out/auth/bravo.json',
  },
};

// Hold {casino?} constant so per-casino default variance doesn't show as drift.
export const referenceCasino = { alpha: 'slots-of-vegas', bravo: 'a-big-candy' };

// One entry per COMPONENT (dedupe by route Action column). Paths templated with {platform}.
// Seed below is the promotions family; extend module-by-module from the route maps.
export const worklist = [
  { module: 'promotions',    platform: 'rtg', alpha: '/{platform}/promotions/create',    bravo: '/{platform}/promotions/create' },
  { module: 'signup',        platform: 'rtg', alpha: '/{platform}/signup/create',        bravo: '/{platform}/signup/create' },
  { module: 'new_depositor', platform: 'rtg', alpha: '/{platform}/new_depositor/create', bravo: '/{platform}/new_depositor/create' },
  // banking-methods, templates, sliders, onboarding-slider, coupon-aliases,
  // game-of-month, launcher, navigation, jackpots, multiplier, ...
];

// Selects fed by these endpoint fragments are dynamic data → don't diff their options.
export const dynamicEndpointHints = ['/campaigns', '/casinos', '/country-list', '/games', '/custom-group'];
