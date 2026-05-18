import { forwardRef } from 'react';

type Props = {
  lineCount: number;
  toolbarHeight: number;
};

export const NoteEditorLineGutter = forwardRef<HTMLDivElement, Props>(function NoteEditorLineGutter(
  { lineCount, toolbarHeight },
  ref,
) {
  return (
    <div className="md-gutter" aria-hidden="true">
      <div className="md-gutter-cap" style={{ height: toolbarHeight }} />
      <div ref={ref} className="md-gutter-scroll">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
});
