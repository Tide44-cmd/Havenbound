import { useEffect, useRef } from "react";
export default function StatusFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        ref.current.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const options = [
    { value: "ignored", label: "Ignored" },
    { value: "unstarted", label: "Not started" },
    { value: "next", label: "Want to play" },
    { value: "started", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "unobtainable", label: "Unobtainable" },
    { value: "unknown", label: "Unknown" },
  ];
  return (
    <details ref={ref} className="status-filter">
      <summary aria-label="Filter statuses">
        {!selected.length
          ? "All statuses"
          : `${selected.length} ${selected.length === 1 ? "status" : "statuses"} selected`}
      </summary>
      <div className="status-filter-panel">
        <fieldset>
          <legend>Match any selected status</legend>
          <button
            type="button"
            className="text-button"
            onClick={() => onChange([])}
          >
            Show all statuses
          </button>
          {options.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, option.value]
                      : selected.filter((s) => s !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <p>
          Select any combination. Leaving all unchecked shows all games,
          including ignored games.
        </p>
      </div>
    </details>
  );
}
