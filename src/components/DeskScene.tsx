export function DeskScene({ night }: { night: boolean }) {
  return (
    <svg
      viewBox="0 0 620 440"
      className={`desk-scene ${night ? 'is-night' : ''}`}
      role="img"
      aria-labelledby="desk-title desk-description"
    >
      <title id="desk-title">A quiet corner by the window</title>
      <desc id="desk-description">
        An illustrated desk with a laptop, books, a plant, and a view of the lake. Switch between
        day and evening using the button below.
      </desc>
      <defs>
        <clipPath id="window-clip">
          <rect x="85" y="30" width="440" height="270" rx="100" />
        </clipPath>
        <pattern id="desk-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth=".5"
            opacity=".07"
          />
        </pattern>
      </defs>
      <rect width="620" height="440" fill="url(#desk-grid)" />
      <g clipPath="url(#window-clip)">
        <rect x="85" y="30" width="440" height="270" className="scene-sky" />
        <circle cx="412" cy="104" r="34" className="scene-sun" />
        <path d="M65 226 Q180 165 289 210 T550 209 V320 H65Z" fill="#8aaba1" />
        <path d="M65 257 Q200 218 350 250 T550 232 V320 H65Z" fill="#557e71" />
        <path
          d="M150 267h100m85-1h85m-152 15h90"
          stroke="#c6d2bd"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g stroke="#dfdfca" strokeWidth="2">
          <path d="M270 30v270M85 176h440" />
        </g>
      </g>
      <rect
        x="85"
        y="30"
        width="440"
        height="270"
        rx="100"
        fill="none"
        stroke="#d7d7c6"
        strokeWidth="8"
      />
      <path d="M35 340h550" stroke="#bc9b76" strokeWidth="14" strokeLinecap="round" />
      <path d="M85 347v80m448-80v80" stroke="#a58260" strokeWidth="10" />
      <path d="M225 225h170a8 8 0 0 1 8 8v98H217v-98a8 8 0 0 1 8-8" fill="#203c34" />
      <rect x="227" y="237" width="166" height="82" rx="3" fill="#2d4b41" />
      <circle cx="310" cy="230" r="2" fill="#81988a" />
      <g strokeLinecap="round" strokeWidth="4">
        <path d="M245 254h30m10 0h44" stroke="#d8c6a7" />
        <path d="M256 268h58m10 0h21" stroke="#8aafa1" />
        <path d="M256 282h31m10 0h61" stroke="#de916c" />
        <path d="M245 296h24" stroke="#d8c6a7" />
      </g>
      <path d="M211 331h198l15 9H196Z" fill="#84948b" />
      <path d="M288 331h46l4 4h-54Z" fill="#b7c1b8" />
      <rect x="439" y="307" width="63" height="12" rx="3" fill="#d38660" />
      <rect x="445" y="319" width="66" height="12" rx="3" fill="#e0c99d" />
      <path d="M454 313h35m-25 12h32" stroke="#f2e8d5" strokeWidth="1.5" />
      <path d="M127 300h39l-5 32h-29Z" fill="#d27b52" />
      <path d="M147 302v-75" stroke="#556f48" strokeWidth="3" />
      <path
        d="M147 274c-35 0-39-26-29-34 22 2 32 17 29 34m0-21c31-2 39-28 28-35-24 5-31 18-28 35m0-14c-19-9-22-27-12-31 13 5 18 18 12 31"
        fill="#6b845a"
      />
      <path d="M520 298h24v32h-24Z" fill="#f0e5cf" />
      <path d="M544 305c18-4 17 19 0 16" fill="none" stroke="#f0e5cf" strokeWidth="5" />
      <path
        d="M528 290q-6-9 0-18m8 18q-6-9 0-18"
        fill="none"
        stroke="#cccebb"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M30 394q41-11 72 0m435 4q30-9 53 0" stroke="#c8c7b6" strokeWidth="2" fill="none" />
    </svg>
  );
}
