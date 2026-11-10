import { useEffect, useRef } from "react";
// Pointer updates are coalesced to one frame; no perpetual JavaScript loop.
export default function AmbientBackground({
  motion = true,
}: {
  motion?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      fine = matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0,
      x = 0,
      y = 0;
    const queue = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          root.style.setProperty("--ambient-x", `${x}px`);
          root.style.setProperty("--ambient-y", `${y}px`);
          frame = 0;
        });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = (event.clientX / innerWidth - 0.5) * 32;
      y = (event.clientY / innerHeight - 0.5) * 24;
      queue();
    };
    const leave = () => {
      x = 0;
      y = 0;
      queue();
    };
    const detach = () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => {
      detach();
      if (motion && !reduced.matches && fine.matches) {
        window.addEventListener("pointermove", move, { passive: true });
        document.documentElement.addEventListener("pointerleave", leave);
      } else if (reduced.matches || !fine.matches) {
        root.style.setProperty("--ambient-x", "0px");
        root.style.setProperty("--ambient-y", "0px");
      }
    };
    sync();
    reduced.addEventListener("change", sync);
    fine.addEventListener("change", sync);
    return () => {
      detach();
      reduced.removeEventListener("change", sync);
      fine.removeEventListener("change", sync);
    };
  }, [motion]);
  return (
    <div ref={ref} className="ambient-background" aria-hidden="true">
      <div className="ambient-scene">
        <svg
          className="ambient-forest"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <path
              id="ambient-pine"
              d="M0 0 30 55 17 55 44 100 24 100 60 160 7 160 7 200 -7 200 -7 160 -60 160 -24 100 -44 100 -17 55 -30 55Z"
            />
          </defs>
          <path
            fill="#52684a"
            opacity=".18"
            d="M0 350Q200 100 450 330T900 220T1440 300V900H0Z"
          />
          {Array.from({ length: 25 }, (_, i) => (
            <use
              key={i}
              href="#ambient-pine"
              transform={`translate(${i * 62 - 20} ${-100 + (i % 5) * 45}) scale(${3.8 + (i % 4) * 0.35})`}
              fill="#385239"
              opacity=".32"
            />
          ))}
          {Array.from({ length: 17 }, (_, i) => (
            <use
              key={i}
              href="#ambient-pine"
              transform={`translate(${i * 95 - 15} ${260 + (i % 3) * 50}) scale(${3.4 + (i % 4) * 0.28})`}
              fill="#0b1912"
            />
          ))}
        </svg>
        <div className="ambient-mist" />
        <div className="ambient-mist ambient-mist-secondary" />
        <div className="ambient-fireflies">
          {Array.from({ length: 36 }, (_, i) => (
            <i
              className="ambient-firefly"
              key={i}
              style={{
                left: `${3 + ((i * 37) % 94)}%`,
                top: `${5 + ((i * 23) % 89)}%`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
                animationDelay: `-${i * 1.9}s`,
                animationDuration: `${9 + (i % 5) * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
