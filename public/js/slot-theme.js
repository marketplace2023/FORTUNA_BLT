let activeTheme;
let effectLayer;
let cabinet;
let motion;
let sceneMotion;

const artBackground = (path) => `url("${path}") center / cover`;
const percussionPitches = new Map([
  ['H1', 110], ['H2', 147], ['H3', 196], ['H4', 247],
  ['L1', 294], ['L2', 370], ['L3', 440], ['L4', 554], ['L5', 659],
]);

export function setSlotTheme(theme, stage, machine, boardWrap) {
  if (!theme.effect) return;
  activeTheme = theme;
  cabinet = machine;
  stage.classList.add('themed-stage');
  machine.classList.add('themed-machine');
  machine.dataset.effect = theme.effect;
  const scene = theme.art ? artBackground(theme.art) : theme.scene;
  if (scene) stage.style.setProperty('--slot-scene', scene);
  if (theme.bonusArt) {
    const preload = new Image();
    preload.src = theme.bonusArt;
  }
  const bonusScene = theme.bonusArt ? artBackground(theme.bonusArt) : theme.bonusScene;
  if (bonusScene) stage.style.setProperty('--bonus-scene', bonusScene);
  effectLayer = document.createElement('div');
  effectLayer.className = 'slot-effect';
  effectLayer.setAttribute('aria-hidden', 'true');
  boardWrap.append(effectLayer);
}

export function playSlotEffect(duration) {
  if (!effectLayer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  motion?.cancel();
  motion = effectLayer.animate(
    [
      { opacity: 0, transform: 'var(--effect-start, scale(.92))' },
      { opacity: 'var(--effect-opacity, .7)', offset: .34 },
      { opacity: 0, transform: 'var(--effect-end, scale(1.06))' },
    ],
    { duration, easing: 'ease-out' },
  );
  if (activeTheme.art && !cabinet.classList.contains('free') &&
      ['train', 'dunes'].includes(activeTheme.effect)) {
    sceneMotion?.cancel();
    const surface = cabinet.closest('.stage');
    const current = getComputedStyle(surface).backgroundPosition;
    sceneMotion = surface.animate(
      [
        { backgroundPosition: current },
        { backgroundPosition: '54% center', offset: .78 },
        { backgroundPosition: current },
      ],
      { duration, easing: 'ease-out' },
    );
  }
}

export function playSlotWin(wins, sound) {
  if (activeTheme?.effect !== 'salsa') return false;
  const frequencies = [...new Set(wins.map((win) => percussionPitches.get(win.sym) ?? 220))];
  frequencies.forEach((frequency, index) => {
    const at = index * .06;
    sound.tone(frequency, .17, { type: 'triangle', vol: .045, slide: -32, at });
  });
  return true;
}
