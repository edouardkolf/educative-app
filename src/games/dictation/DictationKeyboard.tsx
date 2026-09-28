// Clavier alphabétique intégré de la dictée (docs/specs/DICTEE.md §2.2 et §4.4). Ordre alphabétique :
// touches plus grandes qu'un AZERTY, et chaque accent juste après sa lettre de base. La touche ✓
// n'est pas ici : elle appartient à l'écran (DictationScreen).
import { KEY_ROWS } from './keyboard-layout';
import './keyboard.css';

export interface DictationKeyboardProps {
  /** 'copy' : réécriture guidée (⌫ désactivé, une touche fausse ne fait rien). */
  mode: 'free' | 'copy';
  onKey: (char: string) => void;
  onErase: () => void;
  /** Touche à faire trembler (dernière touche refusée en réécriture), ou null. */
  rejectedKey: string | null;
  disabled: boolean;
}

const LETTER_ROWS = KEY_ROWS.slice(0, 5);
const LAST_ROW_CHARS = KEY_ROWS[5] ?? [];

/** Une lettre accentuée diffère de sa forme sans diacritique (base pour le fond `#fff3e6`). */
function isAccented(char: string): boolean {
  const stripped = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return stripped !== char && stripped.length === 1;
}

export function DictationKeyboard({ mode, onKey, onErase, rejectedKey, disabled }: DictationKeyboardProps) {
  return (
    <div class="dict-keyboard" data-mode={mode}>
      <div class="dict-keyboard__grid">
        {LETTER_ROWS.flatMap((row) =>
          row.map((char) => (
            <KeyButton
              key={char}
              char={char}
              onKey={onKey}
              rejected={rejectedKey === char}
              disabled={disabled}
            />
          )),
        )}
        {LAST_ROW_CHARS.map((char) => (
          <KeyButton key={char} char={char} onKey={onKey} rejected={rejectedKey === char} disabled={disabled} />
        ))}
        <div class="dict-key dict-key--spacer" aria-hidden="true" />
        <div class="dict-key dict-key--spacer" aria-hidden="true" />
        <button
          type="button"
          class="dict-key dict-key--erase"
          data-key="del"
          onClick={onErase}
          disabled={disabled || mode === 'copy'}
          aria-label="Effacer la dernière lettre"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

function KeyButton({
  char,
  onKey,
  rejected,
  disabled,
}: {
  char: string;
  onKey: (c: string) => void;
  rejected: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      class={`dict-key${isAccented(char) ? ' dict-key--accent' : ''}${rejected ? ' dict-key--rejected' : ''}`}
      data-key={char}
      onClick={() => onKey(char)}
      disabled={disabled}
    >
      {char}
    </button>
  );
}
