/* Урок-свиток: рендерит обучающий материал темы (markdown) безопасно — через
   react-markdown (React-элементы, без dangerouslySetInnerHTML, без raw HTML). */

import Markdown from 'react-markdown';

type LessonViewProps = {
  body: string;
};

export function LessonView({ body }: LessonViewProps) {
  return (
    <div className="lesson" aria-label="Урок">
      <Markdown>{body}</Markdown>
    </div>
  );
}
