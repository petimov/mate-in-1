export type Coach = {
  slug: string;
  name: string;
  title: string;
  rating: string;
  focus: string;
  price: string;
  formats: string[];
  languages: string[];
  bio: string;
  offer: string[];
  founder?: boolean;
};

export const COACHES: Coach[] = [
  {
    slug: "petra-krupkova",
    name: "Petra Krupková",
    title: "Zakladatelka · trenérka · hlavní metodička",
    rating: "WGM · peak 2349",
    focus: "Jednotažky, individuální hodiny, metodika",
    price: "Na dotaz",
    formats: ["Online", "Dle dohody"],
    languages: ["čeština"],
    founder: true,
    bio: "Mistryně ČR žen 1993.",
    offer: [
      "Individuální hodiny",
      "Metodika a výuka Jednotažek",
      "Osnova od prvního tahu po mat",
      "Konzultace k programu školy",
    ],
  },
];

export function getCoach(slug: string) {
  return COACHES.find((coach) => coach.slug === slug);
}

export const FOUNDER = COACHES[0];
