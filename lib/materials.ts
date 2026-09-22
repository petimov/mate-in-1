export type MaterialTask = {
  prompt: string;
  fen?: string;
};

export type Material = {
  slug: string;
  title: string;
  kind: "pdf" | "list" | "plan";
  audience: string;
  summary: string;
  pages: string[];
  tasks?: MaterialTask[];
};

export const MATERIALS: Material[] = [
  {
    slug: "plan-lekce-1",
    title: "Plán lekce 1 — pravidla",
    kind: "plan",
    audience: "Trenéři kroužku",
    summary: "60 minut od nuly. Cíl: tahy pěšce, věže, krále. Mini partie na konci.",
    pages: [
      "0–5 min: jména, kdo už hrál, desky na stůl.",
      "5–20 min: šachovnice, sloupce a řady, bílé pole vpravo.",
      "20–40 min: pěšec, věž, král. Každé dítě ukáže tah na své desce.",
      "40–55 min: volná hra jen těmito figurami. Trenér chodí a opravuje.",
      "55–60 min: domácí list „označ pole věže“.",
    ],
  },
  {
    slug: "pracovni-list-figury",
    title: "Pracovní list — tahy figur",
    kind: "pdf",
    audience: "Žáci začátečníci",
    summary: "Označte políčka. Tisk A4. Dá se použít ve třídě i jako úkol.",
    pages: [
      "Jezdec na d4: označ všechna pole, kam může skočit.",
      "Střelec na c1: označ pole na volné diagonále.",
      "Věž na a1: označ pole, kam může při prázdné šachovnici.",
    ],
    tasks: [
      {
        prompt: "Jezdec na d4. Označ všechna pole, kam může skočit.",
        fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1",
      },
      {
        prompt: "Střelec na c1. Označ pole na volné diagonále.",
        fen: "4k3/8/8/8/8/8/8/2B1K3 w - - 0 1",
      },
      {
        prompt: "Věž na a1. Označ pole, kam může jít.",
        fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
      },
    ],
  },
  {
    slug: "pracovni-list-sach-mat",
    title: "Pracovní list — šach a mat",
    kind: "pdf",
    audience: "Žáci začátečníci",
    summary: "Rozlišení šach / mat / pat. Jedna strana, tužka, žádný počítač.",
    pages: [
      "Je černý král v šachu? Ano / ne.",
      "Jde o mat? Označ úniková pole, pokud existují.",
      "Najdi tah, který dává mat.",
    ],
    tasks: [
      {
        prompt: "Je černý král v šachu? Zakroužkuj. Označ úniková pole.",
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1",
      },
      {
        prompt: "Bílý na tahu. Najdi mat v 1. Zapiš tah.",
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      },
    ],
  },
  {
    slug: "nabidka-individual",
    title: "Leták — individuální hodiny",
    kind: "pdf",
    audience: "Rodiče a dospělí",
    summary: "Ceník, formáty, jak se objednat. K tisku na nástěnku klubu.",
    pages: [
      "60 min 1:1, Praha nebo online.",
      "Cena podle trenéra 650–900 Kč.",
      "První hodina diagnostika, pak plán.",
    ],
  },
  {
    slug: "prezencni-listina",
    title: "Prezenční listina kroužku",
    kind: "list",
    audience: "Trenéři",
    summary: "Jméno, přítomnost, poznámka. 12 týdnů na jedné A4.",
    pages: ["Vyplňte skupinu, den, trenéra. Zakroužkujte docházku."],
  },
  {
    slug: "info-rodice",
    title: "Info pro rodiče",
    kind: "pdf",
    audience: "Rodiče",
    summary: "Co dítě potřebuje, jak trénovat 10 minut denně, turnaje.",
    pages: [
      "Deska doma, nebo Lichess zdarma.",
      "Úlohy v aplikaci školy: tah i označení polí.",
      "První turnaj až umí mat a zápis.",
    ],
  },
  {
    slug: "plan-8-tydnu",
    title: "Plán 8 týdnů — začátečníci",
    kind: "plan",
    audience: "Trenéři kroužku",
    summary: "Osnova pololetí. Každý týden: téma, úloha v aplikaci, domácí list.",
    pages: [
      "Týden 1: šachovnice, pěšec, věž. Úloha: kam může věž.",
      "Týden 2: střelec, jezdec. Úloha: kam skočí jezdec.",
      "Týden 3: dáma, král, šach. List šach / mat.",
      "Týden 4: mat věží a dámou. Úlohy mat v 1.",
      "Týden 5: hodnota figur, jednoduché výměny.",
      "Týden 6: otevření — střed a rozvoj.",
      "Týden 7: vidlička, vazba. Mini partie se zápisem.",
      "Týden 8: opakování, mini turnaj, info pro rodiče o dalším pololetí.",
    ],
  },
  {
    slug: "ukolnicek",
    title: "Úkolníček na 8 týdnů",
    kind: "list",
    audience: "Žáci + rodiče",
    summary: "Zaškrtni úlohy v aplikaci a papírový list. Jedna A4 na pololetí.",
    pages: [
      "Po každé hodině žák zaškrtne app i list.",
      "Rodič vidí, co zbývá. Trenér na začátku hodiny zkontroluje.",
    ],
  },
  {
    slug: "diplom",
    title: "Diplom — Šachy od nuly",
    kind: "pdf",
    audience: "Žáci",
    summary: "A4 na konec kurzu. Jméno dopiš rukou, nebo před tiskem.",
    pages: [
      "Tisk na tvrdší papír.",
      "Podpis trenéra a razítko školy.",
    ],
  },
  {
    slug: "turnaj-parovani",
    title: "Turnaj — párování 4 kola",
    kind: "list",
    audience: "Trenéři",
    summary: "Mini turnaj kroužku. Stoly, barvy, výsledek. Bez software.",
    pages: [
      "Losuj bílé/černé ručně. Tempo 10+0 nebo 15+0.",
      "Výsledek: 1–0, ½–½, 0–1. Na konci sečti body.",
    ],
  },
];

export function getMaterial(slug: string) {
  return MATERIALS.find((material) => material.slug === slug);
}
