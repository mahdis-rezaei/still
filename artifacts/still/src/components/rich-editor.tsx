import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// A deliberately minimal contentEditable composer for the literary formatting
// set — emphasis, two heading levels, lists, blockquote, and a few muted text
// colors. No editor library: the toolbar drives document.execCommand and we emit
// the raw HTML up to the parent, which sends it to the server. The SERVER is the
// trust boundary (it sanitizes and derives the plain-text body the engine
// reads), so this component only has to produce HTML and stay calm and quiet.

// Muted, on-brand swatches only — no loud colors (per the product's design
// ethos). Values are desaturated earth tones that sit on warm paper.
const SWATCHES: { name: string; value: string }[] = [
  { name: "Ink", value: "#25211C" },
  { name: "Sepia", value: "#8A6F4D" },
  { name: "Clay", value: "#9A5B43" },
  { name: "Moss", value: "#6E6A3E" },
  { name: "Slate", value: "#5B6675" },
  { name: "Plum", value: "#6E5366" },
];

export interface RichEditorHandle {
  clear: () => void;
}

interface Props {
  initialHTML?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (html: string, text: string) => void;
  className?: string;
  ariaLabel?: string;
  "data-testid"?: string;
}

function ToolbarButton({
  label,
  title,
  onActivate,
  className = "",
}: {
  label: React.ReactNode;
  title: string;
  onActivate: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // mousedown-preventDefault keeps the editor's selection while the button
      // is clicked (otherwise the selection collapses and the command no-ops).
      onMouseDown={(e) => {
        e.preventDefault();
        onActivate();
      }}
      className={
        "h-7 min-w-7 px-1.5 rounded-md text-soft-ink hover:text-ink hover:bg-border/40 transition-colors text-sm leading-none flex items-center justify-center " +
        className
      }
    >
      {label}
    </button>
  );
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(
  function RichEditor(
    {
      initialHTML = "",
      placeholder,
      autoFocus,
      onChange,
      className = "",
      ariaLabel,
      "data-testid": testId,
    },
    ref,
  ) {
    const elRef = useRef<HTMLDivElement>(null);
    const [empty, setEmpty] = useState(!initialHTML);

    // Seed once on mount. Never write innerHTML from React again — that would
    // reset the caret on every keystroke.
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      el.innerHTML = initialHTML;
      setEmpty(!el.innerText.trim());
      if (autoFocus) el.focus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      clear() {
        const el = elRef.current;
        if (!el) return;
        el.innerHTML = "";
        setEmpty(true);
        onChange("", "");
      },
    }));

    function emit() {
      const el = elRef.current;
      if (!el) return;
      const text = el.innerText;
      setEmpty(!text.trim());
      onChange(el.innerHTML, text);
    }

    function exec(command: string, value?: string) {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      try {
        document.execCommand("styleWithCSS", false, "true");
      } catch {
        // Older engines may not support styleWithCSS — color still works.
      }
      document.execCommand(command, false, value);
      emit();
    }

    // Toggle a block format (heading/quote) off by returning it to a paragraph.
    function block(tag: string) {
      let current = "";
      try {
        current = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      } catch {
        // ignore — fall through to setting the tag
      }
      exec("formatBlock", current === tag.toLowerCase() ? "P" : tag);
    }

    return (
      <div className={className}>
        <div
          className="flex flex-wrap items-center gap-0.5 pb-2 mb-3 border-b border-border/60"
          role="toolbar"
          aria-label="Text formatting"
        >
          <ToolbarButton
            label={<span className="font-semibold">B</span>}
            title="Bold"
            onActivate={() => exec("bold")}
          />
          <ToolbarButton
            label={<span className="italic font-serif">I</span>}
            title="Italic"
            onActivate={() => exec("italic")}
          />
          <span className="w-px h-4 bg-border mx-1" aria-hidden />
          <ToolbarButton
            label="H"
            title="Heading"
            onActivate={() => block("H2")}
          />
          <ToolbarButton
            label={<span className="text-xs">H</span>}
            title="Subheading"
            onActivate={() => block("H3")}
          />
          <span className="w-px h-4 bg-border mx-1" aria-hidden />
          <ToolbarButton
            label="•"
            title="Bulleted list"
            onActivate={() => exec("insertUnorderedList")}
          />
          <ToolbarButton
            label="1."
            title="Numbered list"
            onActivate={() => exec("insertOrderedList")}
          />
          <ToolbarButton
            label="❝"
            title="Quote"
            onActivate={() => block("BLOCKQUOTE")}
          />
          <span className="w-px h-4 bg-border mx-1" aria-hidden />
          <div className="flex items-center gap-1 px-0.5">
            {SWATCHES.map((s) => (
              <button
                key={s.value}
                type="button"
                title={s.name}
                aria-label={`Color: ${s.name}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  exec("foreColor", s.value);
                }}
                className="w-4 h-4 rounded-full border border-border/70 hover:scale-110 transition-transform"
                style={{ backgroundColor: s.value }}
                data-testid={`button-color-${s.name.toLowerCase()}`}
              />
            ))}
          </div>
          <span className="w-px h-4 bg-border mx-1" aria-hidden />
          <ToolbarButton
            label={<span className="text-xs tracking-tight">⤬</span>}
            title="Clear formatting"
            onActivate={() => exec("removeFormat")}
          />
        </div>

        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          data-placeholder={placeholder}
          data-empty={empty}
          data-testid={testId}
          onInput={emit}
          className="rich-content rich-editor flex-1 w-full bg-transparent focus:outline-none"
        />
      </div>
    );
  },
);
