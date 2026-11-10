// Texte d'une lettre, d'une syllabe ou d'un digraphe : UN seul bloc, la taille s'adapte à la longueur.
export function LetterTile({
  text,
  lower = false,
}: {
  text: string | undefined;
  lower?: boolean;
}) {
  const value = text ?? "";
  return (
    <span
      class={lower ? "rv-letter rv-letter--lower" : "rv-letter"}
      data-len={Math.min(value.length, 5)}
    >
      {value}
    </span>
  );
}
