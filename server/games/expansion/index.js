import batch1 from './batch-1.js';
import batch2 from './batch-2.js';
import batch3 from './batch-3.js';
import batch4 from './batch-4.js';
import batch5 from './batch-5.js';

export const EXPANSION_SLOTS = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5].map((game) => ({
  ...game,
  theme: {
    art: `/assets/expansion/${game.id}.webp`,
    ...game.theme,
    symbolArt: `/assets/expansion/${game.id}`,
  },
}));
