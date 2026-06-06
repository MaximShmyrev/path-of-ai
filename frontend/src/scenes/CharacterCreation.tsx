import { useState } from 'react';

import { Button } from '../components/Button';
import { WindowFrame } from '../components/WindowFrame';
import { useGame } from '../game/store';
import { CLASS_IDS, ru } from '../i18n/ru';

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

        <label>
          {ru.create.classLabel}
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {ru.classes[id]}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" disabled={state.busy}>
          {ru.create.submit}
        </Button>
      </form>
    </WindowFrame>
  );
}
