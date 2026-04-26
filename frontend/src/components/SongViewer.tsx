import type { SongLine } from "../types";
import { ChordBadge } from "./ChordBadge";

type Props = {
  content: SongLine[];
  performance?: boolean;
};

export function SongViewer({ content, performance = false }: Props) {
  return (
    <div className={performance ? "song-viewer performance-lyrics" : "song-viewer"}>
      {content.map((line, lineIndex) => (
        <p className="song-line" key={lineIndex}>
          {line.content.map((token, tokenIndex) =>
            "text" in token ? (
              <span key={tokenIndex}>{token.text}</span>
            ) : (
              <ChordBadge key={tokenIndex} chord={token.chord} />
            )
          )}
        </p>
      ))}
    </div>
  );
}
