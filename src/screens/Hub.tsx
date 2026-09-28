// Souche de l'écran hub (docs/specs/HUB.md §2.1) : juste les boutons de navigation, sans texte ni
// style. Repris par la tâche « Hub et navigation » (T3) pour l'avatar, l'anneau de temps, les tuiles
// et les animations.
import { useEffect } from 'preact/hooks';
import { markHistoryAnchor, navigate, returnTo } from '../app/routes';
import { useProfile } from '../app/context';
import { getGame, visibleGameIds } from '../games';

export function Hub() {
  const { profile } = useProfile();

  // Retient l'entrée d'historique du hub : la maison de la carte et des jeux y remonte sans empiler
  // (HUB.md §2.4, §4.1).
  useEffect(() => {
    markHistoryAnchor('hub');
  }, []);

  if (!profile) return null;

  return (
    <div data-testid="hub">
      <button
        type="button"
        data-testid="hub-to-profiles"
        aria-label="Retour aux profils"
        onClick={() => returnTo('profiles')}
      />
      <button
        type="button"
        data-testid="hub-tile-map"
        aria-label="Carte"
        onClick={() => navigate({ name: 'map' })}
      />
      {visibleGameIds(profile).map((id) => {
        const game = getGame(id);
        if (!game) return null;
        return (
          <button
            key={id}
            type="button"
            data-testid={`hub-tile-${id}`}
            aria-label={game.tileLabel}
            onClick={() => navigate(game.route)}
          />
        );
      })}
    </div>
  );
}
