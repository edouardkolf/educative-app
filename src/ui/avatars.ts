// CONTRAT — avatars proposés pour les profils (l'enfant reconnaît son animal, pas son prénom).
export const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐧', '🐨', '🐰', '🐻'] as const;

/** Nom lisible de chaque avatar (nom accessible des boutons de choix côté parent). */
export const AVATAR_NAMES: Record<(typeof AVATARS)[number], string> = {
  '🦊': 'renard',
  '🐼': 'panda',
  '🐯': 'tigre',
  '🦁': 'lion',
  '🐸': 'grenouille',
  '🐵': 'singe',
  '🦄': 'licorne',
  '🐙': 'pieuvre',
  '🐧': 'manchot',
  '🐨': 'koala',
  '🐰': 'lapin',
  '🐻': 'ours',
};
