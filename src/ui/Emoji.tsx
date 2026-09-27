// Rendu d'un émoji de contenu en SVG embarqué (voir src/ui/emoji.ts) plutôt qu'en glyphe texte :
// remplace un `{char}` existant sans rien changer à la mise en page (taille = font-size hérité,
// comme le texte qu'il remplace — voir emoji.css). Décoratif par défaut (`alt=""`) : si l'émoji est
// le seul contenu d'un bouton sans aria-label, mets l'aria-label sur le bouton plutôt qu'un alt ici.
import type { JSX } from 'preact';
import { emojiUrl } from './emoji';
import './emoji.css';

interface EmojiProps {
  char: string;
  /** Classes additionnelles (en plus de `emoji`, qui porte le dimensionnement). */
  class?: string;
  /** Style inline additionnel (ex. font-size hérité par certains parents dynamiques). */
  style?: JSX.CSSProperties;
}

export function Emoji({ char, class: className, style }: EmojiProps) {
  return (
    <img
      src={emojiUrl(char)}
      alt=""
      class={className ? `emoji ${className}` : 'emoji'}
      style={style}
      draggable={false}
      decoding="async"
    />
  );
}
