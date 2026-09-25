// Pavé numérique 3×4 du code parent : grosses touches, une par chiffre + effacer.
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function NumericKeypad(props: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const { onDigit, onDelete, disabled = false } = props;

  return (
    <div className="pa-keypad">
      {DIGIT_ROWS.flat().map((digit) => (
        <button
          key={digit}
          type="button"
          className="pa-keypad__key"
          data-testid={`pin-key-${digit}`}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <span className="pa-keypad__key pa-keypad__key--spacer" aria-hidden="true" />
      <button
        type="button"
        className="pa-keypad__key"
        data-testid="pin-key-0"
        disabled={disabled}
        onClick={() => onDigit('0')}
      >
        0
      </button>
      <button
        type="button"
        className="pa-keypad__key pa-keypad__key--delete"
        aria-label="Effacer le dernier chiffre"
        disabled={disabled}
        onClick={onDelete}
      >
        ⌫
      </button>
    </div>
  );
}
