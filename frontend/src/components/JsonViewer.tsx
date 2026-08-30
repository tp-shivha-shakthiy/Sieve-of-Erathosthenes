import type { ReactNode } from "react";

interface Props {
  value: unknown;
}

const tokenPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

function highlight(line: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let position = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const [token] = match;
    const index = match.index ?? 0;
    if (index > position) tokens.push(line.slice(position, index));
    const className = match[1] ? "json-key" : match[2] ? "json-string" : match[3] ? "json-number" : match[4] ? "json-boolean" : "json-punctuation";
    tokens.push(<span className={className} key={`${index}-${token}`}>{token}</span>);
    position = index + token.length;
  }
  if (position < line.length) tokens.push(line.slice(position));
  return tokens;
}

export default function JsonViewer({ value }: Props) {
  return (
    <pre className="json-viewer">
      {JSON.stringify(value, null, 2).split("\n").map((line, index) => (
        <span className="json-line" key={`${index}-${line}`}><span className="line-number">{index + 1}</span><code>{highlight(line)}</code></span>
      ))}
    </pre>
  );
}
