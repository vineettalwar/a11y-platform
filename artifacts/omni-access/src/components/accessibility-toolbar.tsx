import { useState, useEffect, useCallback } from "react";
import { Type, Sun, ChevronDown } from "lucide-react";

const STORAGE_KEY_FONT_SIZE = "omni-font-size";
const STORAGE_KEY_CONTRAST = "omni-high-contrast";
const FONT_SIZES = ["text-sm-root", "text-base-root", "text-lg-root"] as const;
type FontSizeClass = typeof FONT_SIZES[number];

function applyFontSize(cls: FontSizeClass) {
  const html = document.documentElement;
  FONT_SIZES.forEach(c => html.classList.remove(c));
  if (cls !== "text-base-root") html.classList.add(cls);
}

function applyContrast(on: boolean) {
  document.documentElement.classList.toggle("high-contrast", on);
}

export default function AccessibilityToolbar() {
  const [fontIdx, setFontIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return Number(localStorage.getItem(STORAGE_KEY_FONT_SIZE) ?? "1");
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_CONTRAST) === "true";
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    applyFontSize(FONT_SIZES[fontIdx]);
    applyContrast(highContrast);
  }, []);

  const decreaseFont = useCallback(() => {
    setFontIdx(prev => {
      const next = Math.max(0, prev - 1);
      applyFontSize(FONT_SIZES[next]);
      localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(next));
      return next;
    });
  }, []);

  const increaseFont = useCallback(() => {
    setFontIdx(prev => {
      const next = Math.min(FONT_SIZES.length - 1, prev + 1);
      applyFontSize(FONT_SIZES[next]);
      localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(next));
      return next;
    });
  }, []);

  const toggleContrast = useCallback(() => {
    setHighContrast(prev => {
      const next = !prev;
      applyContrast(next);
      localStorage.setItem(STORAGE_KEY_CONTRAST, String(next));
      return next;
    });
  }, []);

  if (dismissed) return null;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-semibold focus:rounded-br-md"
      >
        Skip to main content
      </a>

      <div
        role="toolbar"
        aria-label="Accessibility settings"
        className="w-full bg-primary/5 border-b border-primary/10 flex items-center justify-between px-4 h-9 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline font-medium text-primary/70 mr-2 flex items-center gap-1">
            <Type className="h-3 w-3 inline-block mr-1" aria-hidden="true" />
            Accessibility
          </span>

          <div className="flex items-center gap-0.5" role="group" aria-label="Text size">
            <button
              onClick={decreaseFont}
              disabled={fontIdx === 0}
              aria-label="Decrease text size"
              className="h-7 w-7 rounded flex items-center justify-center hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-[11px]"
            >
              A−
            </button>
            <button
              onClick={increaseFont}
              disabled={fontIdx === FONT_SIZES.length - 1}
              aria-label="Increase text size"
              className="h-7 w-7 rounded flex items-center justify-center hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold text-[13px]"
            >
              A+
            </button>
          </div>

          <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />

          <button
            onClick={toggleContrast}
            aria-pressed={highContrast}
            aria-label={highContrast ? "Disable high contrast" : "Enable high contrast"}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-colors ${
              highContrast
                ? "bg-primary text-primary-foreground"
                : "hover:bg-primary/10"
            }`}
          >
            <Sun className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">High Contrast</span>
          </button>
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss accessibility toolbar"
          className="h-7 w-7 rounded flex items-center justify-center hover:bg-primary/10 transition-colors opacity-60 hover:opacity-100"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
