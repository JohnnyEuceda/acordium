from dataclasses import dataclass
import re


VALID_NOTES = {
    "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"
}
EXTENSION_TOKENS = ("maj7", "add9", "m7", "dim", "sus2", "sus4", "b5", "#5", "13", "11", "9", "7", "6", "m")


class ChordValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedChord:
    root: str
    quality: str
    extensions: list[str]
    bass: str | None = None

    def to_dict(self) -> dict:
        return {
            "root": self.root,
            "quality": self.quality,
            "extensions": self.extensions,
            "bass": self.bass,
        }


def _tokenize_body(body: str) -> list[str]:
    tokens: list[str] = []
    cursor = 0
    while cursor < len(body):
        token = next((candidate for candidate in EXTENSION_TOKENS if body.startswith(candidate, cursor)), None)
        if token is None:
            raise ChordValidationError(f"Unsupported chord suffix near '{body[cursor:]}'")
        tokens.append(token)
        cursor += len(token)
    return tokens


def parse_chord(chord: str) -> ParsedChord:
    value = chord.strip()
    if not value:
        raise ChordValidationError("Chord cannot be empty")

    slash_parts = value.split("/")
    if len(slash_parts) > 2:
        raise ChordValidationError("Chord can only contain one slash bass note")

    main = slash_parts[0]
    bass = slash_parts[1] if len(slash_parts) == 2 else None

    root_match = re.match(r"^[A-G](?:#|b)?", main)
    if not root_match:
        raise ChordValidationError(f"Invalid chord root in '{chord}'")

    root = root_match.group(0)
    body = main[len(root):]

    if root not in VALID_NOTES or (bass is not None and bass not in VALID_NOTES):
        raise ChordValidationError(f"Invalid note in '{chord}'")

    tokens = _tokenize_body(body)
    quality = "major"
    extensions: list[str] = []

    if "dim" in tokens:
        quality = "diminished"
    elif "m" in tokens or "m7" in tokens:
        quality = "minor"

    for token in tokens:
        if token == "m":
            continue
        if token == "m7":
            extensions.append("7")
            continue
        if token == "dim":
            continue
        extensions.append(token)

    return ParsedChord(root=root, quality=quality, extensions=extensions, bass=bass)


def validate_chord(chord: str) -> None:
    parse_chord(chord)


def chord_suffix(parsed: ParsedChord) -> str:
    prefix = ""
    if parsed.quality == "minor":
        prefix = "m"
    elif parsed.quality == "diminished":
        prefix = "dim"

    extensions = [ext for ext in parsed.extensions if not (parsed.quality == "minor" and ext == "7")]
    if parsed.quality == "minor" and "7" in parsed.extensions:
        prefix = "m7"
    return prefix + "".join(extensions)
