from copy import deepcopy

from app.domain.chords import chord_suffix, parse_chord


SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
NOTE_TO_INDEX = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
    "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fm", "Bbm", "Ebm", "Abm", "Dbm", "Gbm"}


def prefer_flats(original_key: str | None, chord: str) -> bool:
    return "b" in chord or (original_key in FLAT_KEYS if original_key else False)


def transpose_note(note: str, semitones: int, use_flats: bool) -> str:
    index = (NOTE_TO_INDEX[note] + semitones) % 12
    return (FLAT_NOTES if use_flats else SHARP_NOTES)[index]


def transpose_chord(chord: str, semitones: int, original_key: str | None = None) -> str:
    parsed = parse_chord(chord)
    use_flats = prefer_flats(original_key, chord)
    root = transpose_note(parsed.root, semitones, use_flats)
    bass = transpose_note(parsed.bass, semitones, use_flats) if parsed.bass else None
    suffix = chord_suffix(parsed)
    return f"{root}{suffix}" + (f"/{bass}" if bass else "")


def transpose_song_content(content: list[dict], semitones: int, original_key: str | None = None) -> list[dict]:
    result = deepcopy(content)
    for block in result:
        if block.get("type") != "line":
            continue
        for token in block.get("content", []):
            if "chord" in token:
                token["chord"] = transpose_chord(token["chord"], semitones, original_key)
    return result
