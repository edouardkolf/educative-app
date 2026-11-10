// Banc d'écoute (LECTURE.md §8.5) : le parent écoute ce que la voix du téléphone dit, repère les sons qui sonnent faux.
// Replié par défaut. N'affiche rien si le contenu n'est pas disponible (`benchEntries()` lève).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cancelSpeech, checkVoice, speakSequence } from '../../ui/voice';
import type { SpeechStep } from '../../ui/voice';
import { benchEntries } from './speech';
import type { BenchEntry } from './speech';

const GROUPS: readonly { id: BenchEntry['group']; title: string }[] = [
  { id: 'sons', title: 'Sons des lettres' },
  { id: 'noms', title: 'Noms des lettres' },
  { id: 'syllabes', title: 'Syllabes' },
  { id: 'consignes', title: 'Consignes' },
  { id: 'mots', title: 'Mots des images' },
];
const GAP_MS = 700;

function loadEntries(): BenchEntry[] | null {
  try {
    const list = benchEntries();
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

export function VoiceBench() {
  const entries = useMemo(loadEntries, []);
  const [voiceName, setVoiceName] = useState<string | null | undefined>(undefined);
  /** Ce qui est en cours : `e:<index>` (une entrée) ou `g:<groupe>` (tout un groupe). */
  const [playing, setPlaying] = useState<string | null>(null);
  const token = useRef(0);

  useEffect(() => {
    let alive = true;
    checkVoice().then((v) => alive && setVoiceName(v.voiceName), () => alive && setVoiceName(null));
    return () => {
      alive = false;
      token.current += 1;
      cancelSpeech();
    };
  }, []);

  if (!entries) return null;

  async function play(key: string, steps: readonly SpeechStep[]) {
    // Retaper l'élément en cours l'interrompt.
    if (playing === key) {
      token.current += 1;
      cancelSpeech();
      setPlaying(null);
      return;
    }
    const own = ++token.current;
    setPlaying(key);
    await speakSequence(steps);
    if (token.current === own) setPlaying(null);
  }

  function playGroup(group: BenchEntry['group'], list: readonly BenchEntry[]) {
    const steps: SpeechStep[] = [];
    list.forEach((e, i) => {
      if (i > 0) steps.push({ pauseMs: GAP_MS });
      steps.push(...e.steps);
    });
    return play(`g:${group}`, steps);
  }

  return (
    <details class="rp-bench" data-testid="reading-bench">
      <summary>Banc d'écoute de la voix</summary>
      <p class="pa-muted" data-testid="reading-bench-voice">
        {voiceName === undefined
          ? 'Recherche de la voix…'
          : voiceName
            ? `Voix du téléphone : ${voiceName}.`
            : 'Voix du téléphone : nom inconnu (ou voix indisponible).'}
      </p>
      <p class="pa-muted">
        Touchez une entrée pour l'écouter ; une deuxième touche l'arrête. Notez les sons qui sonnent faux : le banc ne
        fait qu'écouter.
      </p>
      {GROUPS.map(({ id, title }) => {
        const list = entries.filter((e) => e.group === id);
        if (list.length === 0) return null;
        const groupKey = `g:${id}`;
        return (
          <div class="rp-bench__group" key={id} data-testid={`reading-bench-group-${id}`}>
            <div class="rp-bench__head">
              <h3 class="rp-stage__title">{title}</h3>
              <button
                type="button"
                class="pa-button pa-button--secondary rp-bench__all"
                aria-pressed={playing === groupKey}
                data-testid={`reading-bench-all-${id}`}
                onClick={() => void playGroup(id, list)}
              >
                {playing === groupKey ? 'Arrêter' : 'Tout écouter'}
              </button>
            </div>
            <div class="rp-bench__list">
              {list.map((e, i) => {
                const key = `e:${id}:${i}`;
                const on = playing === key;
                return (
                  <button
                    type="button"
                    key={key}
                    class="rp-bench__btn"
                    aria-pressed={on}
                    data-testid="reading-bench-entry"
                    onClick={() => void play(key, e.steps)}
                  >
                    {on ? '• ' : ''}
                    {e.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </details>
  );
}
