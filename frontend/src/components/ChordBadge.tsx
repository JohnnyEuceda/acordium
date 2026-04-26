type Props = {
  chord: string;
};

export function ChordBadge({ chord }: Props) {
  return <span className="chord-badge">{chord}</span>;
}
