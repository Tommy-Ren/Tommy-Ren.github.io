import { useLocale, LanguageSwitch } from './i18n/Locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Github, Linkedin, Mail, MapPin, Sparkles } from 'lucide-react';
import { AnimatedText, FadeIn } from './components/Motion';
import Avatar from './components/Avatar';
import { preloadAvatar } from './components/avatarAsset';
import { BootIntro } from './components/BootIntro';
import './components/BootIntro.css';
import MyPath from './components/MyPath';
import MagneticPointer from './components/MagneticPointer';
import RippleField from './components/RippleField';
import PortfolioNavigation, { NavigationDock } from './components/PortfolioNavigation';
import { experience, expertise, profile, projects, type Project } from './data/portfolio';

const art = (name: string) => `/images/reference/${name}.png`;

function shouldPlayIntro() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ContactButton({ className = '', label = 'Contact me' }: { className?: string; label?: string }) {
  const { t } = useLocale();
  return <a className={`contact-button ${className}`} href={`mailto:${profile.email}`}><span>{t(label)}</span><ArrowUpRight size={20} aria-hidden="true" /></a>;
}

function HeroSection() {
  const { t } = useLocale();
  return <section className="hero" aria-labelledby="hero-title">
    <RippleField />
    <FadeIn className="hero-title-wrap" delay={0.15} y={40}><h1 id="hero-title" className="hero-heading hero-title">{t("Hi, I'm Tommy")}</h1></FadeIn>
    <div className="hero-eyebrow"><span className="status-dot" /><span>{t("Software developer & curious builder")}</span><span className="hero-location">{t("Based in Burnaby, BC ↗")}</span></div>
    <FadeIn className="hero-portrait" delay={0.6} y={30}>
      <Avatar />
    </FadeIn>
    <div className="hero-bottom">
      <FadeIn delay={0.35} y={20}><p className="hero-description">{t("Building intelligent systems")}<br />{t("and playful digital")}<br />{t("experiences.")}</p><a href="#about" className="scroll-link"><ArrowDown size={16} aria-hidden="true" /> {t("Scroll to explore")}</a></FadeIn>
      <FadeIn className="hero-cta" delay={0.5} y={20}><span className="hero-cta-caption">{t("Good things start with a conversation.")}</span><ContactButton /></FadeIn>
    </div>
    <span className="hero-edge-label" aria-hidden="true">{t("CODE × CURIOSITY")}</span>
  </section>;
}

const gallery = [
  ['project-planets.svg', 'Procedural worlds'], ['project-matcher.svg', 'Intelligent tools'], ['project-lottery.svg', 'Interactive systems'],
  ['project-planets-detail.svg', 'Noise & nature'], ['project-matcher-detail.svg', 'Local-first thinking'], ['project-lottery-detail.svg', 'Exploring data'],
  ['project-planets-secondary.svg', 'Made with curiosity'], ['project-lottery-secondary.svg', 'Playful interfaces'], ['project-matcher-secondary.svg', 'From code to context'],
  ['project-planets.svg', 'A world from a seed'], ['project-lottery.svg', 'Built for the browser'],
  ['project-matcher.svg', 'AI meets engineering'], ['project-planets-detail.svg', 'Experiments in code'], ['project-lottery-detail.svg', 'Systems in motion'],
  ['project-matcher-secondary.svg', 'Beyond the interface'], ['project-planets-secondary.svg', 'Creative computing'], ['project-lottery-secondary.svg', 'Thoughtful details'],
  ['project-matcher-detail.svg', 'Developer tools'], ['project-planets.svg', 'Procedural textures'], ['project-lottery.svg', 'Small ideas, real systems'], ['project-matcher.svg', 'Always exploring'],
];

function MarqueeRow({ items, x }: { items: string[][]; x: MotionValue<number> | number }) {
  const { t } = useLocale();
  return <motion.div className="marquee-row" style={{ x, willChange: typeof x === 'number' ? undefined : 'transform' }} aria-hidden="true">
    {[...items, ...items, ...items].map(([image, label], i) => <div className="marquee-tile" key={`${image}-${i}`}><img src={`/images/${image}`} alt="" loading="lazy" decoding="async" width="420" height="270" /><span>{t(label)}<ArrowUpRight size={15} /></span></div>)}
  </motion.div>;
}

function MarqueeSection() {
  const { t } = useLocale();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const right = useTransform(scrollYProgress, [0, 1], [-550, 0]);
  const left = useTransform(scrollYProgress, [0, 1], [0, -550]);
  return <section ref={ref} className="marquee-section" aria-label={t("Visual explorations from my projects")}>
    <div className="section-overline"><span><Sparkles size={14} aria-hidden="true" /> {t("A few things in my orbit")}</span><span>{t("Code, systems & experiments")}</span></div>
    <div className="marquee-viewport"><MarqueeRow items={gallery.slice(0, 11)} x={reduced ? -120 : right} /><MarqueeRow items={gallery.slice(11)} x={reduced ? -270 : left} /></div>
    <p className="gallery-note">{t("Original visual studies inspired by my projects.")}</p>
  </section>;
}

function AboutSection() {
  const { t } = useLocale();
  return <section id="about" className="about-section" aria-labelledby="about-title">
    <FadeIn className="about-art about-moon" delay={0.1} x={-80} y={0} duration={0.9}><img src={art('moon')} alt="" loading="lazy" width="714" height="714" /></FadeIn>
    <FadeIn className="about-art about-object" delay={0.25} x={-80} y={0} duration={0.9}><img src={art('object')} alt="" loading="lazy" width="420" height="446" /></FadeIn>
    <FadeIn className="about-art about-lego" delay={0.15} x={80} y={0} duration={0.9}><img src={art('lego')} alt="" loading="lazy" width="708" height="862" /></FadeIn>
    <FadeIn className="about-art about-group" delay={0.3} x={80} y={0} duration={0.9}><img src={art('group')} alt="" loading="lazy" width="688" height="676" /></FadeIn>
    <div className="about-center">
      <FadeIn><span className="eyebrow">{t("01 / A little about me")}</span><h2 id="about-title" className="hero-heading section-heading">{t("About me")}</h2></FadeIn>
      <AnimatedText className="about-copy" text={t(profile.intro)} />
      <FadeIn className="education-tags"><span>{t("SFU · Computing Science")}</span><span>{t("AI + Statistics")}</span><span>{t("BCIT alumnus")}</span></FadeIn>
      <FadeIn><ContactButton label={t("Let's connect")} /></FadeIn>
    </div>
    <div className="experience-block" id="experience">
      <div className="experience-header"><span className="eyebrow">{t("Where I've been building")}</span><span className="muted">{t("A little experience. A lot of curiosity.")}</span></div>
      {experience.map((item, i) => <FadeIn delay={i * 0.08} key={item.company} className="experience-row"><div><h3>{t(item.role)}</h3><p>{item.company}</p></div><p className="experience-description">{t(item.description)}</p><span className="experience-period">{t(item.period)}</span></FadeIn>)}
    </div>
  </section>;
}

function ExpertiseSection() {
  const { t } = useLocale();
  return <section id="expertise" className="expertise-section" aria-labelledby="expertise-title">
    <FadeIn className="expertise-heading"><span className="eyebrow">{t("03 / What I bring to the table")}</span><h2 id="expertise-title" className="section-heading">{t("Expertise")}</h2><p>{t("Different disciplines. One engineering mindset.")}</p></FadeIn>
    <div className="expertise-list">{expertise.map((item, i) => <FadeIn key={item.number} className="expertise-item" delay={i * 0.1}><span className="expertise-number">{item.number}</span><div><h3>{t(item.name)}</h3><p>{t(item.description)}</p></div><ArrowUpRight className="expertise-arrow" size={36} aria-hidden="true" /></FadeIn>)}</div>
    <div className="stack-line"><span>{t("Python")}</span><span>{t("TypeScript")}</span><span>{t("C / C++ / C#")}</span><span>{t("React")}</span><span>{t("FastAPI")}</span><span>{t("AWS")}</span><span>{t("Unity")}</span></div>
  </section>;
}

function ProjectCard({ project, index, total, progress }: { project: Project; index: number; total: number; progress: MotionValue<number> }) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.02, 1]);
  const scale = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.03]);
  const destination = project.liveUrl || project.repository;
  return <div ref={ref} className="project-container" style={{ top: 96 + index * 28 }}>
    <motion.article className="project-card" style={{ scale: reduced ? 1 : scale }} aria-labelledby={`project-${project.id}`}>
      <div className="project-top"><span className="project-number">{project.number}</span><div className="project-name"><span className="eyebrow">{t(project.category)} / {project.year}</span><h3 id={`project-${project.id}`}>{project.name}</h3></div><a className="ghost-button" href={destination} target="_blank" rel="noopener noreferrer">{t(project.liveUrl ? 'Live project' : 'Source code')}<ArrowUpRight size={19} aria-hidden="true" /></a></div>
      <div className="project-gallery"><div className="project-details"><div className="project-image detail-image"><img src={project.detailImages[0]} alt={`${project.name} — feature illustration`} loading="lazy" /></div><div className="project-image secondary-image"><img src={project.detailImages[1]} alt={`${project.name} — interface study`} loading="lazy" /></div></div><div className="project-image main-image"><motion.img src={project.image} alt={`${project.name} — original project illustration`} loading="lazy" style={{ scale: reduced ? 1 : imageScale }} /></div></div>
      <div className="project-caption"><p>{t(project.description)}</p><div className="project-tech">{project.stack.map(tech => <span key={tech}>{tech}</span>)}<a href={project.repository} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} source on GitHub`}><Github size={20} /></a></div></div>
    </motion.article>
  </div>;
}

function ProjectsSection() {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return <section id="projects" className="projects-section" aria-labelledby="projects-title"><FadeIn className="projects-heading"><span className="eyebrow">{t("04 / From curiosity to code")}</span><h2 id="projects-title" className="hero-heading section-heading">{t("Projects")}</h2><p>{t("A few experiments that became something you can explore.")}</p></FadeIn><div ref={ref} className="project-stack">{projects.map((project, i) => <ProjectCard key={project.id} project={project} index={i} total={projects.length} progress={scrollYProgress} />)}</div></section>;
}

function ContactSection() {
  const { t } = useLocale();
  return <footer id="contact" className="contact-section" aria-labelledby="contact-title">
    <div className="contact-center">
      <FadeIn className="contact-copy">
        <span className="eyebrow">{t("05 / The next good idea")}</span>
        <h2 id="contact-title" className="hero-heading contact-heading">{t("Let's build")}<br /><span>{t("something.")}</span></h2>
        <p>{t("Have a thoughtful problem, an interesting opportunity,")}<br className="desktop-break" /> {t("or just a good question? I'd love to hear it.")}</p>
        <a className="email-link" href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight aria-hidden="true" /></a>
      </FadeIn>
      <div className="contact-navigation"><p>{t("One more stop? Pick a destination.")}</p><NavigationDock /></div>
    </div>
    <div className="footer-bottom"><a className="footer-brand" href="#hero">{t("Tommy Ren")}<span className="status-dot" /></a><span className="footer-location"><MapPin size={14} aria-hidden="true" /> {t("Burnaby, BC, Canada")}</span><div className="social-links"><a href={profile.github} target="_blank" rel="noopener noreferrer"><Github size={17} /> {t("GitHub")}</a><a href={profile.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={17} /> {t("LinkedIn")}</a><a href={`mailto:${profile.email}`}><Mail size={17} /> {t("Email")}</a></div><span className="copyright">© {new Date().getFullYear()} {t("Tommy Ren")}</span></div>
  </footer>;
}

export default function App() {
  useEffect(() => { void import('./blog/statistics').then(module => module.loadStatistics()).catch(() => {}); }, []);
  const { t } = useLocale();
  const [introVisible, setIntroVisible] = useState(shouldPlayIntro);
  const [pageReady, setPageReady] = useState(!introVisible);
  const focusAfterIntro = useRef(false);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#hero') preloadAvatar();
  }, []);
  const completeIntro = useCallback((skipped: boolean) => {
    focusAfterIntro.current = skipped;
    setIntroVisible(false);
  }, []);

  useEffect(() => {
    if (!pageReady) return;
    const frame = requestAnimationFrame(() => {
      if (focusAfterIntro.current) main.current?.focus({ preventScroll: true });
      // Hash targets did not exist while the opening was mounted.
      let hash = window.location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* Keep a malformed hash harmless. */ }
      if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pageReady]);

  return <>
    <MagneticPointer />
    <AnimatePresence onExitComplete={() => setPageReady(true)}>
      {introVisible && <BootIntro key="boot-intro" onComplete={completeIntro} />}
    </AnimatePresence>
    {pageReady && <><a className="skip-link" href="#about">{t("Skip to content")}</a><PortfolioNavigation /><LanguageSwitch className="portfolio-language" /><main ref={main} id="hero" className="site-wrapper" tabIndex={-1}><HeroSection /><MarqueeSection /><AboutSection /><MyPath /><ExpertiseSection /><ProjectsSection /><ContactSection /></main></>}
  </>;
}
