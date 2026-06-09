// Lightweight markup for mobile writing. RN's TextInput can't style ranges of
// editable text live, so instead the writer types/sees small markers (the
// iA Writer / Bear pattern) and we convert them to the server's allowlist HTML
// (`bodyRich`) on save. That round-trips with the web's rich editor and renders
// natively via components/rich-text.tsx.
//
// Marker vocabulary (maps 1:1 to the sanitizer's allowed tags):
//   **bold**            -> <strong>
//   _italic_            -> <em>
//   "## " line          -> <h2>
//   "### " line         -> <h3>
//   "- " line           -> <ul><li>
//   "1. " line          -> <ol><li>
//   "> " line           -> <blockquote><p>

export type FormatAction = "bold" | "italic" | "h2" | "h3" | "ul" | "ol" | "quote";

const BLOCK_PREFIX: Record<string, string> = {
  h2: "## ",
  h3: "### ",
  ul: "- ",
  quote: "> ",
};

// Any block marker at the start of a line (so switching block type replaces it).
const ANY_BLOCK = /^(#{2,3}\s|>\s|[-*]\s|\d+\.\s)/;

// The line span [lineStart, lineEnd) covering the current selection.
function lineBounds(text: string, start: number, end: number) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let lineEnd = text.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = text.length;
  return { lineStart, lineEnd };
}

function applyBlock(
  text: string,
  start: number,
  end: number,
  action: FormatAction,
): string {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const segment = text.slice(lineStart, lineEnd);
  const lines = segment.split("\n");
  const ordered = action === "ol";
  const prefix = ordered ? "1. " : BLOCK_PREFIX[action];

  // Toggle off if every line already carries exactly this marker.
  const allHave = lines.every((ln) => {
    const m = ANY_BLOCK.exec(ln);
    if (!m) return false;
    return ordered ? /^\d+\.\s/.test(ln) : ln.startsWith(prefix);
  });

  const next = lines
    .map((ln, i) => {
      const stripped = ln.replace(ANY_BLOCK, "");
      if (allHave) return stripped;
      return (ordered ? `${i + 1}. ` : prefix) + stripped;
    })
    .join("\n");

  return text.slice(0, lineStart) + next + text.slice(lineEnd);
}

function applyInline(
  text: string,
  start: number,
  end: number,
  marker: string,
): string {
  if (start === end) {
    // No selection: drop in an empty pair the writer can type inside.
    return text.slice(0, start) + marker + marker + text.slice(end);
  }
  const sel = text.slice(start, end);
  return text.slice(0, start) + marker + sel + marker + text.slice(end);
}

// Apply a toolbar action to `text` given the current selection. Returns the new
// full text (we deliberately don't force the cursor afterward — controlling the
// TextInput selection on every edit is what makes RN editors janky).
export function applyMarkup(
  text: string,
  start: number,
  end: number,
  action: FormatAction,
): string {
  if (action === "bold") return applyInline(text, start, end, "**");
  if (action === "italic") return applyInline(text, start, end, "_");
  return applyBlock(text, start, end, action);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Inline markers within one line. Bold first (greedy pairs), then italic — the
// markers don't overlap (** vs _) so order is safe.
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

// Convert marker text to sanitizer-safe HTML. `hasFormatting` tells the caller
// whether any real markup is present — if not, there's no point sending bodyRich
// (the plain body already carries the text, newlines and all).
export function markupToHtml(text: string): { html: string; hasFormatting: boolean } {
  const lines = text.split("\n");
  let html = "";
  let hasFormatting = false;
  let listType: "ul" | "ol" | null = null;
  let inQuote = false;

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html += "</blockquote>";
      inQuote = false;
    }
  };

  for (const line of lines) {
    const mUl = /^[-*]\s+(.*)$/.exec(line);
    const mOl = /^\d+\.\s+(.*)$/.exec(line);
    if (mUl) {
      closeQuote();
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${inline(mUl[1])}</li>`;
      hasFormatting = true;
      continue;
    }
    if (mOl) {
      closeQuote();
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${inline(mOl[1])}</li>`;
      hasFormatting = true;
      continue;
    }
    closeList();

    const mQuote = /^>\s+(.*)$/.exec(line);
    if (mQuote) {
      if (!inQuote) {
        html += "<blockquote>";
        inQuote = true;
      }
      html += `<p>${inline(mQuote[1])}</p>`;
      hasFormatting = true;
      continue;
    }
    closeQuote();

    const mH3 = /^###\s+(.*)$/.exec(line);
    if (mH3) {
      html += `<h3>${inline(mH3[1])}</h3>`;
      hasFormatting = true;
      continue;
    }
    const mH2 = /^##\s+(.*)$/.exec(line);
    if (mH2) {
      html += `<h2>${inline(mH2[1])}</h2>`;
      hasFormatting = true;
      continue;
    }

    if (line.trim() === "") continue; // blank line = paragraph break
    const withInline = inline(line);
    if (withInline !== escapeHtml(line)) hasFormatting = true;
    html += `<p>${withInline}</p>`;
  }

  closeList();
  closeQuote();
  return { html, hasFormatting };
}
