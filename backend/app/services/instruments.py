from app.domain.chords import parse_chord


GUITAR_SHAPES = {
    "C": {"frets": [-1, 3, 2, 0, 1, 0], "fingers": [0, 3, 2, 0, 1, 0]},
    "D": {"frets": [-1, -1, 0, 2, 3, 2], "fingers": [0, 0, 0, 1, 3, 2]},
    "E": {"frets": [0, 2, 2, 1, 0, 0], "fingers": [0, 2, 3, 1, 0, 0]},
    "F": {"frets": [1, 3, 3, 2, 1, 1], "fingers": [1, 3, 4, 2, 1, 1]},
    "G": {"frets": [3, 2, 0, 0, 0, 3], "fingers": [2, 1, 0, 0, 0, 3]},
    "A": {"frets": [-1, 0, 2, 2, 2, 0], "fingers": [0, 0, 1, 2, 3, 0]},
    "B": {"frets": [-1, 2, 4, 4, 4, 2], "fingers": [0, 1, 3, 4, 4, 1]},
}

NOTE_TO_KEY = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
    "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}


def render_chord(chord: str, instrument: str) -> dict:
    parsed = parse_chord(chord)
    if instrument == "piano":
        return {
            "root": parsed.root,
            "quality": parsed.quality,
            "highlightedKeys": [NOTE_TO_KEY[parsed.root]],
            "bass": parsed.bass,
        }
    root = parsed.root.replace("#", "").replace("b", "")
    return {
        "root": parsed.root,
        "quality": parsed.quality,
        "shape": GUITAR_SHAPES.get(root, GUITAR_SHAPES["C"]),
        "bass": parsed.bass,
    }


def collect_chords(content: list[dict]) -> list[str]:
    seen: set[str] = set()
    chords: list[str] = []
    for block in content:
        for token in block.get("content", []):
            chord = token.get("chord")
            if chord and chord not in seen:
                seen.add(chord)
                chords.append(chord)
    return chords
