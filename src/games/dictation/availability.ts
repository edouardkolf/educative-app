// Disponibilité de la dictée (docs/specs/DICTEE.md §6.1, arbitrage A5) : enveloppe `checkVoice()`
// et rend une `Availability` (registre `src/games/index.ts`, HUB.md §4.2). En cas de problème,
// `parentHint` reprend le texte du tableau §5.3 : la fiche enfant explique cause et remède.
import { checkVoice, type VoiceProblem } from '../../ui/voice';
import type { Availability } from '../index';

const PARENT_HINT_BY_PROBLEM: Record<VoiceProblem, string> = {
  'no-api': 'Ce navigateur ne sait pas faire parler le téléphone : ouvrez l\'application avec Chrome.',
  'no-french-voice':
    'Aucune voix française : Paramètres Android › Accessibilité › Synthèse vocale, Français (France).',
  'no-offline-voice':
    'Voix française absente hors connexion : installez les données vocales Français (France).',
};

const MUTED_HINT =
  'Le son de l\'application est coupé (onglet Réglages) : la dictée a besoin de la voix.';

export async function checkDictationAvailability(): Promise<Availability> {
  const check = await checkVoice();
  if (check.status === 'muted') return { available: false, parentHint: MUTED_HINT };
  if (check.status === 'unavailable') {
    const hint = check.problem ? PARENT_HINT_BY_PROBLEM[check.problem] : PARENT_HINT_BY_PROBLEM['no-api'];
    return { available: false, parentHint: hint };
  }
  return { available: true };
}
