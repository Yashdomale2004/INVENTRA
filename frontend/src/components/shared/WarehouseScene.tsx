const SHIRT_PATH =
  "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z";

/** Faint hanging-rail / boxes / barcode motif — decorative only, very low opacity. */
export function WarehouseSceneLeft({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 640" preserveAspectRatio="xMidYMid meet" className={className}>
      <line x1="18" y1="46" x2="162" y2="46" stroke="rgba(191,219,254,0.16)" strokeWidth="1.5" />
      <circle cx="18" cy="46" r="2.5" fill="rgba(191,219,254,0.2)" />
      <circle cx="162" cy="46" r="2.5" fill="rgba(191,219,254,0.2)" />
      {[32, 74, 116, 148].map((x, i) => (
        <g key={x} transform={`translate(${x - 12}, 50) rotate(${i % 2 === 0 ? -4 : 4} 12 20)`}>
          <line x1="12" y1="0" x2="12" y2="8" stroke="rgba(219,234,254,0.18)" strokeWidth="1.2" />
          <path d={SHIRT_PATH} transform="translate(0,6) scale(1.15)" fill="rgba(219,234,254,0.1)" />
        </g>
      ))}
      <rect x="22" y="420" width="72" height="56" rx="6" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
      <line x1="22" y1="420" x2="94" y2="476" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="94" y1="420" x2="22" y2="476" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <rect x="86" y="452" width="64" height="48" rx="6" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
      <line x1="86" y1="452" x2="150" y2="500" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="150" y1="452" x2="86" y2="500" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <g transform="translate(28, 552)">
        {[3, 2, 4, 2, 3, 5, 2, 3, 4, 2, 3, 2, 4, 3].map((w, i) => (
          <rect key={i} x={i * 8} y="0" width={w} height="30" fill="rgba(255,255,255,0.12)" />
        ))}
      </g>
    </svg>
  );
}

/** Faint shipment-route / map-pin / dashboard motif — decorative only, very low opacity. */
export function WarehouseSceneRight({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 640" preserveAspectRatio="xMidYMid meet" className={className}>
      <path d="M40,110 Q95,170 130,260" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="1.4" strokeDasharray="3 6" strokeLinecap="round" />
      <path d="M130,260 Q95,360 55,460" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="1.4" strokeDasharray="3 6" strokeLinecap="round" />
      {([[40, 110], [130, 260], [55, 460]] as const).map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="10" stroke="rgba(56,189,248,0.14)" strokeWidth="1" fill="none" />
          <circle cx={cx} cy={cy} r="4" fill="rgba(103,232,249,0.4)" />
        </g>
      ))}
      {(
        [
          [20, 60], [150, 90], [100, 180], [160, 340], [30, 300],
          [70, 420], [140, 500], [100, 560], [150, 600], [25, 540],
        ] as const
      ).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.3" fill="rgba(255,255,255,0.14)" />
      ))}
      <g transform="translate(30, 560)">
        {[18, 30, 22, 36, 26].map((h, i) => (
          <rect key={i} x={i * 16} y={40 - h} width="10" height={h} rx="2" fill="rgba(255,255,255,0.12)" />
        ))}
      </g>
    </svg>
  );
}
