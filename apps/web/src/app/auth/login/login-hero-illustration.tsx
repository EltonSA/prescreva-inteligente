import { cn } from '@/lib/utils'

/**
 * Ilustração hero do login: rede IA + biologia espalhada no canvas largo.
 * Paleta: primary (#E3EAE2, #C0D2BE, #466758, #3E5A4E).
 */
export function LoginHeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 300"
      className={cn(
        'w-full h-auto max-h-[min(48vh,360px)] min-h-[200px] drop-shadow-[0_24px_48px_rgba(0,0,0,0.2)]',
        className,
      )}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="loginDotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.65" fill="#C0D2BE" opacity="0.12" />
        </pattern>
        <pattern id="loginFineGrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" stroke="#E3EAE2" strokeOpacity="0.05" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="loginAiHalo" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#C0D2BE" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#466758" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#3E5A4E" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="loginCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E3EAE2" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#C0D2BE" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#466758" stopOpacity="0.15" />
        </radialGradient>
      </defs>

      <rect width="720" height="300" fill="url(#loginDotGrid)" opacity="0.85" />
      <rect width="720" height="300" fill="url(#loginFineGrid)" opacity="0.9" />

      <ellipse cx="360" cy="278" rx="320" ry="13" fill="#466758" opacity="0.22" />
      <ellipse cx="360" cy="283" rx="260" ry="7" fill="#3E5A4E" opacity="0.14" />

      <path
        d="M-40 160 A 140 140 0 0 1 240 24"
        stroke="#C0D2BE"
        strokeWidth="0.75"
        strokeOpacity="0.16"
        fill="none"
      />
      <path
        d="M680 270 A 110 110 0 0 0 520 70"
        stroke="#E3EAE2"
        strokeWidth="0.65"
        strokeOpacity="0.11"
        fill="none"
      />
      <path
        d="M360 0 A 200 200 0 0 1 620 120"
        stroke="#C0D2BE"
        strokeWidth="0.5"
        strokeOpacity="0.1"
        fill="none"
      />

      <circle cx="175" cy="128" r="138" fill="url(#loginAiHalo)" />
      <circle cx="560" cy="115" r="72" fill="url(#loginAiHalo)" opacity="0.65" />

      {/* Biologia — cantos e bordas */}
      <g opacity="0.5" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(598, 6)" stroke="#C0D2BE" fill="none" strokeWidth="1.35" opacity="0.88">
          <path d="M8 0 Q18 24 8 48 Q-2 72 8 96" />
          <path d="M28 0 Q18 24 28 48 Q38 72 28 96" />
          <line x1="9" y1="16" x2="25" y2="20" strokeWidth="1" opacity="0.72" />
          <line x1="7" y1="32" x2="27" y2="36" strokeWidth="1" opacity="0.72" />
          <line x1="9" y1="48" x2="25" y2="52" strokeWidth="1" opacity="0.72" />
          <line x1="7" y1="64" x2="27" y2="68" strokeWidth="1" opacity="0.68" />
          <line x1="9" y1="80" x2="25" y2="84" strokeWidth="1" opacity="0.65" />
        </g>
        <g transform="translate(18, 14)" stroke="#E3EAE2" fill="none" strokeWidth="2.2" opacity="0.78">
          <path d="M12 0L20 36M20 0L12 36" />
          <path d="M16 0v8M16 28v8" strokeWidth="1.7" opacity="0.55" />
          <circle cx="16" cy="18" r="3" stroke="#C0D2BE" strokeWidth="1" opacity="0.5" />
        </g>
        <g transform="translate(8, 198)">
          <ellipse cx="28" cy="24" rx="26" ry="11" fill="#466758" fillOpacity="0.12" stroke="#C0D2BE" strokeWidth="1.25" />
          <ellipse cx="28" cy="20" rx="21" ry="8.5" fill="none" stroke="#C0D2BE" strokeWidth="0.85" opacity="0.5" />
          <path
            d="M10 19 Q16 11 24 17 Q32 13 42 18 Q38 24 30 22 Q22 26 14 22 Q10 20 10 19"
            fill="none"
            stroke="#466758"
            strokeWidth="1.1"
            opacity="0.42"
          />
          <path
            d="M12 23 Q20 28 28 21 Q34 25 44 20"
            fill="none"
            stroke="#3E5A4E"
            strokeWidth="0.95"
            opacity="0.36"
          />
          {[18, 24, 32, 38].map((x, i) => (
            <circle key={i} cx={x} cy={17 + (i % 2) * 3} r={1.4 + (i % 2) * 0.4} fill="#C0D2BE" opacity={0.35 + i * 0.05} />
          ))}
        </g>
        <g transform="translate(628, 178)">
          <circle cx="20" cy="20" r="17" fill="#466758" fillOpacity="0.09" stroke="#C0D2BE" strokeWidth="1.25" />
          <circle cx="20" cy="20" r="8.5" fill="#466758" fillOpacity="0.38" />
          <ellipse cx="20" cy="20" rx="14" ry="14" stroke="#C0D2BE" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.35" fill="none" />
          <circle cx="15" cy="15" r="2.2" fill="#E3EAE2" opacity="0.55" />
          <circle cx="25" cy="24" r="1.6" fill="#C0D2BE" opacity="0.5" />
          <circle cx="26" cy="12" r="1.3" fill="#C0D2BE" opacity="0.38" />
          <path d="M8 26 Q12 22 14 26 Q16 30 12 32" stroke="#466758" strokeWidth="1" opacity="0.35" fill="none" />
        </g>
        <g transform="translate(648, 108)">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={i * 3}
              y={i * 7}
              width={13 - i * 0.5}
              height={4.5}
              rx={2.25}
              fill="#466758"
              fillOpacity={0.32 - i * 0.04}
              stroke="none"
              transform={`rotate(${-8 + i * 14} ${6 + i * 3} ${2.25 + i * 7})`}
            />
          ))}
        </g>
        <g transform="translate(268, 222)" stroke="#C0D2BE" fill="#466758" fillOpacity="0.22" strokeWidth="1.15" opacity="0.7">
          <line x1="22" y1="14" x2="6" y2="28" />
          <line x1="22" y1="14" x2="38" y2="28" />
          <line x1="22" y1="14" x2="22" y2="2" />
          <line x1="22" y1="14" x2="34" y2="6" />
          <circle cx="22" cy="14" r="4.2" fill="#C0D2BE" fillOpacity="0.4" stroke="#E3EAE2" strokeWidth="0.8" />
          <circle cx="6" cy="28" r="3" stroke="none" fill="#466758" fillOpacity="0.4" />
          <circle cx="38" cy="28" r="3" stroke="none" fill="#466758" fillOpacity="0.4" />
          <circle cx="22" cy="2" r="2.6" stroke="none" fill="#E3EAE2" fillOpacity="0.55" />
          <circle cx="34" cy="6" r="2" stroke="none" fill="#C0D2BE" fillOpacity="0.45" />
        </g>
        <g transform="translate(420, 228)" stroke="#C0D2BE" fill="none" strokeWidth="1.2" opacity="0.55">
          <rect x="2" y="20" width="26" height="7" rx="1.5" fill="#466758" fillOpacity="0.18" stroke="#C0D2BE" />
          <line x1="15" y1="20" x2="15" y2="8" />
          <line x1="15" y1="8" x2="15" y2="2" />
          <circle cx="15" cy="2" r="6" />
          <line x1="9" y1="2" x2="21" y2="2" />
          <circle cx="15" cy="0" r="2" fill="#E3EAE2" fillOpacity="0.45" stroke="none" />
          <circle cx="12" cy="14" r="1.2" fill="#C0D2BE" opacity="0.5" stroke="none" />
          <circle cx="18" cy="11" r="0.9" fill="#E3EAE2" opacity="0.4" stroke="none" />
        </g>
        <g transform="translate(520, 208)" opacity="0.42">
          <path d="M8 2 Q12 8 8 14 Q4 20 8 26" stroke="#C0D2BE" strokeWidth="1.2" fill="none" />
          <path d="M20 2 Q16 8 20 14 Q24 20 20 26" stroke="#E3EAE2" strokeWidth="1.2" fill="none" />
          <line x1="9" y1="8" x2="17" y2="10" stroke="#466758" strokeWidth="0.8" opacity="0.5" />
          <line x1="8" y1="16" x2="18" y2="18" stroke="#466758" strokeWidth="0.8" opacity="0.45" />
        </g>
      </g>

      {/* Rede principal (esquerda) */}
      <g stroke="#C0D2BE" strokeWidth="1.3" strokeLinecap="round" opacity="0.82">
        <line x1="38" y1="92" x2="72" y2="102" />
        <line x1="58" y1="108" x2="98" y2="88" />
        <line x1="98" y1="88" x2="138" y2="72" />
        <line x1="98" y1="88" x2="88" y2="132" />
        <line x1="88" y1="132" x2="58" y2="108" />
        <line x1="138" y1="72" x2="162" y2="108" />
        <line x1="162" y1="108" x2="128" y2="138" />
        <line x1="128" y1="138" x2="88" y2="132" />
        <line x1="138" y1="72" x2="128" y2="138" />
        <line x1="72" y1="68" x2="98" y2="88" />
        <line x1="72" y1="68" x2="58" y2="108" />
        <line x1="138" y1="72" x2="168" y2="66" />
        <line x1="168" y1="66" x2="162" y2="108" />
        <line x1="38" y1="92" x2="26" y2="122" />
        <line x1="26" y1="122" x2="88" y2="132" />
        <line x1="128" y1="138" x2="118" y2="162" />
        <line x1="118" y1="162" x2="88" y2="132" />
        <line x1="162" y1="108" x2="218" y2="98" />
        <line x1="168" y1="66" x2="218" y2="98" />
      </g>
      <circle cx="72" cy="68" r="5" fill="#466758" opacity="0.6" />
      <circle cx="168" cy="66" r="4.5" fill="#466758" opacity="0.5" />
      <circle cx="26" cy="122" r="4" fill="#C0D2BE" opacity="0.65" />
      <circle cx="118" cy="162" r="4" fill="#466758" opacity="0.45" />
      <circle cx="38" cy="92" r="5.5" fill="#466758" opacity="0.75" />
      <circle cx="58" cy="108" r="7" fill="#466758" opacity="0.85" />
      <circle cx="138" cy="72" r="6" fill="#466758" opacity="0.65" />
      <circle cx="88" cy="132" r="6" fill="#466758" opacity="0.65" />
      <circle cx="162" cy="108" r="6" fill="#466758" opacity="0.55" />
      <circle cx="128" cy="138" r="5" fill="#C0D2BE" opacity="0.9" />
      <circle cx="218" cy="98" r="5" fill="#466758" opacity="0.5" />

      {/* Satélite direito */}
      <g stroke="#C0D2BE" strokeWidth="1.1" strokeLinecap="round" opacity="0.55">
        <line x1="458" y1="92" x2="492" y2="78" />
        <line x1="492" y1="78" x2="528" y2="88" />
        <line x1="492" y1="78" x2="478" y2="118" />
        <line x1="528" y1="88" x2="548" y2="108" />
        <line x1="548" y1="108" x2="512" y2="132" />
        <line x1="512" y1="132" x2="478" y2="118" />
        <line x1="528" y1="88" x2="512" y2="132" />
      </g>
      <circle cx="458" cy="92" r="4.5" fill="#466758" opacity="0.45" />
      <circle cx="528" cy="88" r="4.5" fill="#466758" opacity="0.42" />
      <circle cx="478" cy="118" r="4" fill="#C0D2BE" opacity="0.5" />
      <circle cx="548" cy="108" r="4" fill="#466758" opacity="0.4" />
      <circle cx="512" cy="132" r="3.5" fill="#466758" opacity="0.38" />

      {/* Ponte entre clusters */}
      <g stroke="#C0D2BE" strokeWidth="1" strokeLinecap="round" opacity="0.35">
        <line x1="218" y1="98" x2="320" y2="92" />
        <line x1="162" y1="108" x2="280" y2="105" />
        <line x1="128" y1="138" x2="340" y2="118" />
        <line x1="320" y1="92" x2="458" y2="92" />
        <line x1="280" y1="105" x2="478" y2="118" />
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 98 88"
          to="360 98 88"
          dur="100s"
          repeatCount="indefinite"
        />
        <circle cx="98" cy="88" r="38" stroke="#E3EAE2" strokeWidth="0.9" strokeDasharray="5 9" opacity="0.22" fill="none" />
        <circle cx="98" cy="88" r="46" stroke="#C0D2BE" strokeWidth="0.6" strokeDasharray="2 14" opacity="0.18" fill="none" />
      </g>

      <circle cx="98" cy="88" r="24" fill="url(#loginCoreGlow)" opacity="0.98" />
      <circle cx="98" cy="88" r="24" stroke="#466758" strokeWidth="1.8" fill="none" opacity="0.4" />
      <path
        d="M98 74v28M84 88h28"
        stroke="#3E5A4E"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="98" cy="88" r="5" fill="#466758" opacity="0.55" />
      <circle cx="98" cy="88" r="2.2" fill="#E3EAE2" opacity="0.9" />

      <path
        d="M185 78 C 320 40 480 95 620 125"
        stroke="#E3EAE2"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeDasharray="6 14"
        opacity="0.26"
      />
      <path
        d="M175 108 C 290 118 420 145 590 168"
        stroke="#C0D2BE"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeDasharray="5 16"
        opacity="0.2"
      />
      <path
        d="M220 125 C 380 160 520 185 640 195"
        stroke="#E3EAE2"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeDasharray="4 18"
        opacity="0.16"
      />

      <g fill="#E3EAE2" opacity="0.9">
        <path d="M152 42l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
        <path d="M340 32l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity="0.72" />
        <path d="M520 48l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" opacity="0.62" />
        <path d="M640 88l1.2 3.5 3.5 1.2-3.5 1.2-1.2 3.5-1.2-3.5-3.5-1.2 3.5-1.2z" opacity="0.48" />
        <path d="M400 68l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" opacity="0.4" />
      </g>
    </svg>
  )
}
