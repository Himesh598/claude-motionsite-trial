import { useEffect, useState } from 'react';
import { ArrowRight, ArrowDown, ChevronUp, Info, X } from 'lucide-react';
import { useVideoScrub } from '@/useVideoScrub';

const DARK = '#1D3045';
const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

const NAV_LINKS = [
  'VECTRUS ENERGY',
  'VECTRUS UPSTREAM',
  'VECTRUS MARKETS',
  'VECTRUS SYSTEMS',
  'VECTRUS+',
];

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function Stagger({
  show,
  delay,
  className,
  children,
}: {
  show: boolean;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.8s ${EASE} ${delay}ms, transform 0.8s ${EASE} ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const { containerRef, videoRef, canvasRef, scrollProgress, canvasLive } =
    useVideoScrub(VIDEO_SRC);

  const [navIn, setNavIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setNavIn(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const p = scrollProgress;

  const s1Opacity = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.08);
  const s2Opacity =
    p < 0.32
      ? 0
      : p < 0.4
        ? (p - 0.32) / 0.08
        : p < 0.55
          ? 1
          : Math.max(0, 1 - (p - 0.55) / 0.08);
  const s3Opacity = p < 0.67 ? 0 : p < 0.75 ? (p - 0.67) / 0.08 : 1;

  const isLight = p > 0.55;
  const navColor = isLight ? '#FFFFFF' : DARK;

  const navEntrance = (delay: number) => ({
    opacity: navIn ? 1 : 0,
    transform: navIn ? 'translateY(0)' : 'translateY(-12px)',
    transition: `opacity 0.6s ${EASE} ${delay}ms, transform 0.6s ${EASE} ${delay}ms`,
  });

  return (
    <>
      <div ref={containerRef} className="relative h-[500vh]">
        <div className="sticky top-0 w-full h-screen overflow-hidden">
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: canvasLive ? 1 : 0 }}
          />

          <div className="absolute inset-0 pointer-events-none">
            {/* NAVBAR */}
            <nav className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-6 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-6 flex items-center justify-between">
              {/* mobile hamburger */}
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden flex flex-col"
                style={{ gap: '5px' }}
              >
                <span
                  className="block transition-colors duration-500"
                  style={{ width: 24, height: 2, backgroundColor: navColor }}
                />
                <span
                  className="block transition-colors duration-500"
                  style={{ width: 24, height: 2, backgroundColor: navColor }}
                />
                <span
                  className="block transition-colors duration-500"
                  style={{ width: 16, height: 2, backgroundColor: navColor }}
                />
              </button>

              {/* desktop links */}
              <div className="hidden lg:flex items-center gap-8 xl:gap-10">
                {NAV_LINKS.map((label, i) => (
                  <a
                    key={label}
                    href="#"
                    className="relative text-xs tracking-[0.15em] uppercase font-medium hover:opacity-70 transition-colors duration-500"
                    style={{ color: navColor, ...navEntrance(i * 80 + 100) }}
                  >
                    {label}
                    {i === 0 && (
                      <span
                        className="absolute -bottom-3 left-0 w-full transition-colors duration-500"
                        style={{ height: 2, backgroundColor: navColor }}
                      />
                    )}
                  </a>
                ))}
              </div>

              {/* right cluster */}
              <div
                className="hidden sm:flex items-center gap-8"
                style={navEntrance(500)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-500"
                    style={{ color: navColor }}
                  >
                    NEWS
                  </span>
                  <span
                    className="flex items-center justify-center rounded-full transition-colors duration-500"
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: navColor,
                      color: isLight ? DARK : '#FFFFFF',
                    }}
                  >
                    <Info size={10} />
                  </span>
                </div>
                <span
                  className="hidden lg:block text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-500"
                  style={{ color: navColor }}
                >
                  MENU
                </span>
                <button
                  onClick={() => setMenuOpen(true)}
                  className="lg:hidden text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-500"
                  style={{ color: navColor }}
                >
                  MENU
                </button>
              </div>
            </nav>

            {/* SECTION 1 */}
            <section
              className="absolute inset-0 flex items-center px-6 sm:px-8 md:px-20 lg:px-32"
              style={{ opacity: s1Opacity, transition: 'opacity 0.1s ease-out' }}
            >
              <div>
                <Stagger show={s1Opacity > 0.3} delay={0}>
                  <h1
                    className="font-light uppercase leading-[1.2]"
                    style={{ fontSize: 'clamp(2rem, 5vw, 5rem)', color: DARK }}
                  >
                    Advancing resources for a cleaner future
                  </h1>
                </Stagger>
                <Stagger show={s1Opacity > 0.3} delay={150} className="mt-6">
                  <p
                    className="text-sm tracking-[0.3em] uppercase"
                    style={{ color: '#1D304590' }}
                  >
                    Sustainable power with purpose
                  </p>
                </Stagger>
              </div>

              <Stagger
                show={s1Opacity > 0.3}
                delay={300}
                className="absolute bottom-12 right-6 sm:right-8 md:right-12"
              >
                <button
                  aria-label="Next"
                  className="flex items-center justify-center rounded-full border hover:opacity-70 pointer-events-auto"
                  style={{
                    width: 48,
                    height: 48,
                    borderColor: '#1D304580',
                    color: DARK,
                  }}
                >
                  <ArrowRight size={18} />
                </button>
              </Stagger>
            </section>

            {/* SECTION 2 */}
            <section
              className="absolute inset-0 flex items-center justify-center px-6 sm:px-8"
              style={{ opacity: s2Opacity, transition: 'opacity 0.1s ease-out' }}
            >
              <div className="max-w-[900px]">
                <Stagger show={s2Opacity > 0.3} delay={0}>
                  <h2
                    className="font-extralight tracking-wide leading-[1.3] text-center uppercase"
                    style={{ fontSize: 'clamp(1.5rem, 4.5vw, 4.5rem)', color: DARK }}
                  >
                    We build lasting partnerships with vision{' '}
                    <span style={{ color: '#1D3045CC' }}>and precision</span>{' '}
                    <span style={{ color: '#1D304580' }}>across every frontier</span>
                  </h2>
                </Stagger>
              </div>

              <div className="absolute bottom-16 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-4">
                <Stagger show={s2Opacity > 0.3} delay={200}>
                  <button
                    aria-label="Scroll down"
                    className="flex items-center justify-center rounded-full border pointer-events-auto"
                    style={{
                      width: 48,
                      height: 48,
                      borderColor: '#1D304566',
                      color: DARK,
                    }}
                  >
                    <ArrowDown size={18} />
                  </button>
                </Stagger>

                <Stagger show={s2Opacity > 0.3} delay={350} className="mt-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full"
                      style={{ width: 8, height: 8, backgroundColor: DARK }}
                    />
                    <span
                      className="rounded-full"
                      style={{ width: 6, height: 6, backgroundColor: '#1D304566' }}
                    />
                    <span
                      className="rounded-full"
                      style={{ width: 6, height: 6, backgroundColor: '#1D304566' }}
                    />
                  </div>
                </Stagger>

                <Stagger show={s2Opacity > 0.3} delay={500} className="mt-2">
                  <button
                    aria-label="Back to top"
                    className="flex items-center justify-center rounded-full border pointer-events-auto"
                    style={{
                      width: 40,
                      height: 40,
                      borderColor: '#1D30454D',
                      color: '#1D3045CC',
                    }}
                  >
                    <ChevronUp size={16} />
                  </button>
                </Stagger>
              </div>
            </section>

            {/* SECTION 3 */}
            <section
              className="absolute inset-0 flex items-center justify-end px-6 sm:px-8 md:px-20 lg:px-32"
              style={{ opacity: s3Opacity, transition: 'opacity 0.1s ease-out' }}
            >
              <div className="max-w-2xl text-left">
                <Stagger show={s3Opacity > 0.3} delay={0}>
                  <p className="text-white/60 text-lg tracking-wide mb-4">Halder | Nordvik</p>
                </Stagger>
                <Stagger show={s3Opacity > 0.3} delay={150}>
                  <h2
                    className="font-light text-white leading-[1.2] uppercase tracking-wide mb-8"
                    style={{ fontSize: 'clamp(2rem, 4vw, 4rem)' }}
                  >
                    Fueling ambition,
                    <br />
                    shaping tomorrow.
                  </h2>
                </Stagger>
                <Stagger show={s3Opacity > 0.3} delay={300}>
                  <div className="flex items-center gap-4">
                    <span className="text-sm tracking-[0.3em] text-white/80 uppercase">
                      Contact Nordvik
                    </span>
                    <button
                      aria-label="Contact Nordvik"
                      className="flex items-center justify-center rounded-full bg-white text-gray-800 hover:scale-110 transition-transform duration-300 pointer-events-auto"
                      style={{ width: 40, height: 40 }}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </Stagger>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <div
        className={`fixed inset-0 z-[100] ${
          menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        style={{
          backgroundColor: DARK,
          transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), visibility 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className={`w-full h-full flex flex-col ${
            menuOpen ? 'translate-y-0' : '-translate-y-8'
          }`}
          style={{ transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="flex justify-end px-6 sm:px-8 pt-8 sm:pt-12">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center rounded-full border border-white/30 text-white hover:border-white transition-colors"
              style={{ width: 40, height: 40 }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12">
            {NAV_LINKS.map((label, i) => (
              <a
                key={label}
                href="#"
                onClick={() => setMenuOpen(false)}
                className={`py-3 text-2xl sm:text-3xl font-light tracking-wide uppercase ${
                  i === 0 ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.8s ${EASE} ${i * 60}ms, transform 0.8s ${EASE} ${i * 60}ms`,
                }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-8 px-8 sm:px-12 pb-10">
            <a href="#" className="text-xs tracking-[0.2em] uppercase text-white/60">
              NEWS
            </a>
            <a href="#" className="text-xs tracking-[0.2em] uppercase text-white/60">
              CONTACT
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
