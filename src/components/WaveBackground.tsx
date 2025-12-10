export function WaveBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      
      {/* Red glow top */}
      <div 
        className="absolute -top-1/2 -left-1/4 w-full h-full opacity-30"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 20% 20%, hsl(0, 84%, 30%) 0%, transparent 60%)',
        }}
      />
      
      {/* Red glow bottom right */}
      <div 
        className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 80% 80%, hsl(0, 84%, 35%) 0%, transparent 60%)',
        }}
      />

      {/* Animated wave layers */}
      <svg
        className="absolute bottom-0 left-0 w-full h-1/2 opacity-10"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(0, 84%, 50%)" />
            <stop offset="50%" stopColor="hsl(0, 70%, 40%)" />
            <stop offset="100%" stopColor="hsl(0, 84%, 50%)" />
          </linearGradient>
        </defs>
        <path
          fill="url(#waveGrad1)"
          className="animate-[wave_15s_ease-in-out_infinite]"
          d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,197.3C672,213,768,203,864,181.3C960,160,1056,128,1152,128C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0 w-full h-1/3 opacity-5"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="hsl(0, 84%, 50%)"
          className="animate-[wave_12s_ease-in-out_infinite_reverse]"
          d="M0,256L48,234.7C96,213,192,171,288,165.3C384,160,480,192,576,213.3C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(-2%) translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
}
