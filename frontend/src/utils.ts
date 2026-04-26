import type { SongLine } from "./types";

export function parseNaturalSong(input: string): SongLine[] {
  return input.split(/\r?\n/).map((line) => {
    const content: SongLine["content"] = [];
    const pattern = /\[([^\]]+)\]/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > cursor) {
        content.push({ text: line.slice(cursor, match.index) });
      }
      content.push({ chord: match[1].trim() });
      cursor = match.index + match[0].length;
    }

    if (cursor < line.length) {
      content.push({ text: line.slice(cursor) });
    }

    return { type: "line", content };
  });
}

export function stringifySong(content: SongLine[]): string {
  return content
    .map((line) =>
      line.content.map((token) => ("text" in token ? token.text : `[${token.chord}]`)).join("")
    )
    .join("\n");
}
