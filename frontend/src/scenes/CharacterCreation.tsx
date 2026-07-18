import { useState } from 'react';

import { HeroPortrait } from '../components/ArtSlots';
import { Button } from '../components/Button';
import { WindowFrame } from '../components/WindowFrame';
import { useGame } from '../game/store';
import { CLASS_IDS, ru } from '../i18n/ru';
import { resolveAsset } from '../theme/assets';

export function CharacterCreation() {
  const { createHero, state } = useGame();
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<string>(CLASS_IDS[0]);
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const nameInvalid = trimmed.length === 0;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameInvalid) return;
    void createHero(trimmed, classId);
  };

  return (
    <WindowFrame title={ru.create.heading}>
      <form onSubmit={onSubmit}>
        <label>
          {ru.create.nameLabel}
          <input
            value={name}
            placeholder={ru.create.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {touched && nameInvalid && <p role="alert">{ru.create.nameRequired}</p>}

        <fieldset className="class-picker">
          <legend>{ru.create.classLabel}</legend>
          <div
            className="class-cards"
            role="radiogroup"
            aria-label={ru.create.classLabel}
          >
            {CLASS_IDS.map((id) => {
              const art = resolveAsset(id);
              const selected = id === classId;
              return (
                <button
                  key={id}
                  type="button"
                  className="class-card"
                  role="radio"
                  aria-label={ru.classes[id]}
                  aria-checked={selected}
                  data-selected={selected}
                  onClick={() => setClassId(id)}
                >
                  <HeroPortrait
                    classId={id}
                    size={120}
                    {...(art !== undefined ? { src: art } : {})}
                  />
                  <span className="class-card__title">{ru.classes[id]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button type="submit" disabled={state.busy}>
          {ru.create.submit}
        </Button>
      </form>
    </WindowFrame>
  );
}
