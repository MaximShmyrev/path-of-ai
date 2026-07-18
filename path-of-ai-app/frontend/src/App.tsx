import { AppShell } from './components/AppShell';
import { useGame } from './game/store';
import { ru } from './i18n/ru';
import { CharacterCreation } from './scenes/CharacterCreation';
import { LocationView } from './scenes/LocationView';
import { WorldMapScene } from './scenes/WorldMapScene';

export function App() {
  const { state } = useGame();
  return (
    <AppShell>
      <h1 className="app-title">{ru.appTitle}</h1>
      {state.error !== null && (
        <p className="banner banner--alert" role="alert">
          {state.error}
        </p>
      )}
      {state.screen === 'loading' && <p className="banner">{ru.loading}</p>}
      {state.screen === 'create' && <CharacterCreation />}
      {state.screen === 'map' && <WorldMapScene />}
      {state.screen === 'location' && <LocationView />}
    </AppShell>
  );
}
