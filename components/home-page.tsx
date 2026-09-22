import Link from "next/link";

import { HomePhoto } from "@/components/home-photo";
import { FOUNDER } from "@/lib/coaches";
import { SCHOOL } from "@/lib/school";

const CARDS = [
  {
    href: "/ulohy",
    icon: "/brand/icon3.png",
    title: "Jednotažky",
    text: "Mat v 1 a označení pole.",
  },
  {
    href: "/ulohy/trenink",
    icon: "/brand/icon4.png",
    title: "Trénink",
    text: "Opakování tahů. SRS. Denní dávka z kurzu.",
  },
  {
    href: "/#kontakt",
    icon: "/brand/icon1.png",
    title: "Hodina s trenérkou",
    text: "Individuálně. Plán, PDF, Jednotažky.",
  },
  {
    href: "/pro-trenery",
    icon: "/brand/icon2.png",
    title: "Pro trenéry",
    text: "Pracovní listy, plány lekcí, tisk úloh.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Otevři kurz",
    text: "Jednotažky. Kapitola, podkapitola, úloha.",
  },
  {
    n: "2",
    title: "Zahraj tah",
    text: "Správný tah odemkne řešení. Špatný se vrátí.",
  },
  {
    n: "3",
    title: "Opakuj",
    text: "Trénink podle SRS. To, co ještě držíš, počká.",
  },
  {
    n: "4",
    title: "Hodina",
    text: "Metodika, plán, další úlohy.",
  },
] as const;

export function HomePage() {
  return (
    <main className="home-root min-h-0 flex-1 overflow-y-auto">
      <section className="home-hero">
        <div className="home-hero-row">
          <div className="home-copy">
            <h1>
              Jednotažky
            </h1>
            <p>{SCHOOL.tagline}</p>
            <div className="home-actions">
              <Link href="/ulohy" className="home-btn">
                Jednotažky
              </Link>
              <Link href="#jak-to-funguje" className="home-how">
                Jak to funguje <span className="home-how-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="home-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/chess.png" alt="" className="home-cutout" />
          </div>
        </div>
      </section>

      <section id="nabidka" className="home-servicing scroll-mt-28">
        <div className="home-wrap">
          <p className="home-kicker">Škola</p>
          <h2>Co tu je</h2>
          <p className="home-lead">
            Kurz, trénink, hodina s trenérkou. Od prvního tahu po turnaj.
          </p>
          <div className="home-cards">
            {CARDS.map((card) => (
              <Link key={card.href} href={card.href} className="home-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.icon} alt="" width={72} height={72} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="o-nas" className="home-about-sec scroll-mt-28">
        <div className="home-wrap home-about-grid">
          <div className="home-about-visual">
            <HomePhoto
              src="/brand/petra.png"
              alt={FOUNDER.name}
              className="home-about-photo"
            />
          </div>
          <div>
            <p className="home-kicker">Trenérka</p>
            <h2>Kdo učí</h2>
            <p className="home-lead">{FOUNDER.rating}</p>
            <p className="home-lead">
              {FOUNDER.name}. {FOUNDER.title}. {FOUNDER.bio} Zakladatelka školy.
              Individuální hodiny a metodika Jednotažek.
            </p>
          </div>
        </div>
      </section>

      <section id="jak-to-funguje" className="home-timeline scroll-mt-28">
        <div className="home-wrap">
          <p className="home-kicker">Jak to funguje</p>
          <h2>Postup spolupráce</h2>
          <div className="home-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`home-step home-step-${i + 1}`}
                data-n={step.n}
              >
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-wrap">
          <p className="home-kicker">Napište nám</p>
          <h2>Začni s Jednotažkami</h2>
          <p className="home-lead">
            Kurz online. Hodina podle dohody.
          </p>
          <Link href="/ulohy" className="home-btn">
            Jednotažky
          </Link>
        </div>
      </section>

      <section className="home-stories">
        <div className="home-wrap">
          <p className="home-kicker">Metodika</p>
          <h2>Jak učíme</h2>
          <div className="home-story-grid">
            <article className="home-card">
              <h3>Mat v 1</h3>
              <p>
                Jedna pozice. Jeden tah. Nejdřív deska, až potom text. Řešení
                až po správném tahu.
              </p>
            </article>
            <article className="home-card">
              <h3>Opakování</h3>
              <p>
                Úlohy se vrací, dokud drží. Trénink z kurzu, ne náhodný mix.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="kontakt" className="home-contact scroll-mt-28">
        <div className="home-wrap home-contact-grid">
          <div>
            <p className="home-kicker">Kontakt</p>
            <h2>Ozvěte se</h2>
            <p className="home-lead">
              {SCHOOL.address}
              <br />
              {SCHOOL.phone}
              <br />
              {SCHOOL.email}
            </p>
          </div>
          <div className="home-contact-panel">
            <p className="home-kicker">Škola</p>
            <h3>{SCHOOL.name}</h3>
            <p className="home-lead">{SCHOOL.city}. {FOUNDER.name}.</p>
            <a href={`mailto:${SCHOOL.email}`} className="home-btn">
              Napsat e-mail
            </a>
          </div>
        </div>
      </section>

      <section className="home-bar">
        <div className="home-wrap home-bar-row">
          <p>{SCHOOL.address}</p>
          <a href={`tel:${SCHOOL.phone.replace(/\s/g, "")}`}>{SCHOOL.phone}</a>
          <a href={`mailto:${SCHOOL.email}`}>{SCHOOL.email}</a>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-wrap home-footer-row">
          <p>
            © {SCHOOL.name}. {SCHOOL.founder}.
          </p>
          <nav>
            <Link href="/ulohy">Jednotažky</Link>
            <Link href="/pro-trenery">Pro trenéry</Link>
            <Link href="/ucet">Nastavení</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
