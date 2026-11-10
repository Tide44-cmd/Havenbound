// Decorative vector scenery; no network images or personal data are involved.
export default function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-mist" />
      <svg
        className="ambient-forest"
        viewBox="0 0 1440 460"
        preserveAspectRatio="xMidYMax slice"
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
          d="M0 250Q200 100 450 260T900 220T1440 230V460H0Z"
        />
        {Array.from({ length: 25 }, (_, i) => (
          <use
            key={i}
            href="#ambient-pine"
            transform={`translate(${i * 62 - 20} ${150 + (i % 5) * 18}) scale(${0.9 + (i % 4) * 0.15})`}
            fill="#385239"
            opacity=".5"
          />
        ))}
        {Array.from({ length: 17 }, (_, i) => (
          <use
            key={i}
            href="#ambient-pine"
            transform={`translate(${i * 95 - 15} ${255 + (i % 3) * 22}) scale(${1.1 + (i % 4) * 0.13})`}
            fill="#0b1912"
          />
        ))}
      </svg>
      {Array.from({ length: 12 }, (_, i) => (
        <i
          className="ambient-firefly"
          key={i}
          style={{
            left: `${7 + i * 8}%`,
            top: `${22 + ((i * 17) % 65)}%`,
            animationDelay: `-${i * 2.7}s`,
            animationDuration: `${18 + (i % 4) * 3}s`,
          }}
        />
      ))}
    </div>
  );
}
