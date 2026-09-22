export type Course = {
  slug: string;
  title: string;
  level: string;
  age: string;
  format: string;
  duration: string;
  price: string;
  summary: string;
  forWho: string;
  lessons: string[];
};

export const COURSES: Course[] = [
  {
    slug: "sachy-od-nuly",
    title: "Šachy od nuly",
    level: "Začátečníci",
    age: "6–10 let",
    format: "Kroužek / online",
    duration: "60 min · 1× týdně",
    price: "1 800 Kč / pololetí",
    summary:
      "Pravidla, tahy figur, šach a mat. Děti hrají od první hodiny. Žádný spěch, hodně desek.",
    forWho: "Děti, které šachy ještě nehrály, nebo znají jen tahy pěšce a věže.",
    lessons: [
      "Šachovnice, pole, tahy figur",
      "Braní, šach, krytí krále",
      "Mat jednou figurou (dáma, věž)",
      "Hodnota figur a jednoduché výměny",
      "Mini partie a fair play",
    ],
  },
  {
    slug: "zacatecnici-plus",
    title: "Začátečníci plus",
    level: "Mírně pokročilí",
    age: "8–14 let",
    format: "Kroužek / online",
    duration: "60 min · 1× týdně",
    price: "1 900 Kč / pololetí",
    summary:
      "Otevření, základní taktiky, matové sítě. Úlohy na tah i na označení polí.",
    forWho: "Žáci, kteří umí pravidla a chtějí vyhrávat krátké partie.",
    lessons: [
      "Vidlička, vazba, oběť na f7",
      "Matování krále na okraji",
      "Rozvoj a obsazení středu",
      "Jednoduché koncovky K+D a K+V",
      "Zápis partie a rozbor",
    ],
  },
  {
    slug: "dospeli-zacatecnici",
    title: "Dospělí začátečníci",
    level: "Začátečníci",
    age: "15+",
    format: "Skupina max. 6 / online",
    duration: "75 min · 1× týdně",
    price: "2 400 Kč / 8 lekcí",
    summary:
      "Klídnější tempo. Pravidla bez zbytečné teorie. Cíl: samostatná partie a radost z hry.",
    forWho: "Dospělí, kteří se chtějí naučit šachy od základu, bez dětského kroužku.",
    lessons: [
      "Pravidla a notace",
      "Otevření bez biflování",
      "Taktika na 2–3 tahy",
      "Mat v 1 a označení polí",
      "Jak trénovat doma 15 minut denně",
    ],
  },
  {
    slug: "individualni-hodiny",
    title: "Individuální hodiny",
    level: "Všechny úrovně",
    age: "Děti i dospělí",
    format: "1:1 prezenčně / online",
    duration: "60 min",
    price: "650–900 Kč / hodina",
    summary:
      "Trenér staví plán podle hráče. Příprava na turnaj, kroužek, nebo první kroky.",
    forWho: "Kdo chce rychlejší posun než ve skupině. I jako doplněk kroužku.",
    lessons: [
      "Vstupní diagnostika a cíl",
      "Domácí úlohy v aplikaci",
      "Rozbor vlastních partií",
      "Taktika, koncovky, otevření dle potřeby",
      "Příprava na konkrétní turnaj",
    ],
  },
];

export function getCourse(slug: string) {
  return COURSES.find((course) => course.slug === slug);
}
