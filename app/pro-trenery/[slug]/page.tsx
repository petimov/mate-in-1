import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { PrintBoard } from "@/components/print-board";
import { PrintButton } from "@/components/print-button";
import { COACHES } from "@/lib/coaches";
import { getMaterial, MATERIALS } from "@/lib/materials";
import { SCHOOL } from "@/lib/school";

export function generateStaticParams() {
  return MATERIALS.map((material) => ({ slug: material.slug }));
}

const WEEKS = Array.from({ length: 12 }, (_, index) => index + 1);
const ROWS = Array.from({ length: 10 }, (_, index) => index + 1);
const ROUNDS = [1, 2, 3, 4];
const HOMEWORK_WEEKS = [
  "Šachovnice, pěšec, věž",
  "Střelec, jezdec",
  "Dáma, král, šach",
  "Mat věží a dámou",
  "Hodnota figur",
  "Otevření — střed",
  "Vidlička, vazba",
  "Mini turnaj",
];

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const material = getMaterial(slug);
  if (!material) notFound();

  return (
    <PageShell className="print-sheet print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pro-trenery"
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← Materiály
        </Link>
        <PrintButton />
      </div>

      <p className="text-xs uppercase tracking-wide text-amber-500/80 print:text-zinc-600">
        {SCHOOL.name} · {material.audience}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight print:text-black">
        {material.title}
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-400 print:text-zinc-700">
        {material.summary}
      </p>
      <p className="print:hidden mt-2 text-xs text-zinc-500">
        Tisk → Uložit jako PDF.
      </p>

      <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-zinc-300 print:text-zinc-800">
        {material.pages.map((page) => (
          <li key={page}>{page}</li>
        ))}
      </ol>

      {material.tasks?.length ? (
        <div className="mt-10 grid gap-10 md:grid-cols-2 print:grid-cols-2">
          {material.tasks.map((task) => (
            <div key={task.prompt} className="break-inside-avoid">
              <p className="mb-3 text-sm font-medium print:text-black">
                {task.prompt}
              </p>
              {task.fen ? <PrintBoard fen={task.fen} /> : null}
              <p className="mt-2 text-xs text-zinc-500 print:text-zinc-600">
                Označ pole tužkou. Správně / špatně: ______
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {material.slug === "prezencni-listina" ? <AttendanceTable /> : null}
      {material.slug === "ukolnicek" ? <HomeworkTable /> : null}
      {material.slug === "diplom" ? <Diploma /> : null}
      {material.slug === "turnaj-parovani" ? <PairingTable /> : null}
      {material.slug === "nabidka-individual" ? <CoachPriceTable /> : null}
    </PageShell>
  );
}

function CoachPriceTable() {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="text-left text-zinc-400 print:text-zinc-600">
            <th className="border border-zinc-600 px-3 py-2">Trenér</th>
            <th className="border border-zinc-600 px-3 py-2">Zaměření</th>
            <th className="border border-zinc-600 px-3 py-2">Cena</th>
          </tr>
        </thead>
        <tbody>
          {COACHES.map((coach) => (
            <tr key={coach.slug}>
              <td className="border border-zinc-600 px-3 py-2 print:text-black">
                {coach.name}
                <div className="text-xs text-zinc-500">{coach.title}</div>
              </td>
              <td className="border border-zinc-600 px-3 py-2 print:text-black">
                {coach.focus}
              </td>
              <td className="border border-zinc-600 px-3 py-2 print:text-black">
                {coach.price}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-zinc-400 print:text-zinc-700">
        Objednávka: {SCHOOL.email} · {SCHOOL.phone} · {SCHOOL.address}
      </p>
    </div>
  );
}

function AttendanceTable() {
  return (
    <div className="mt-8 overflow-x-auto">
      <p className="mb-3 text-sm text-zinc-400 print:text-zinc-700">
        Skupina: __________ · Den: __________ · Trenér: __________
      </p>
      <table className="w-full min-w-[40rem] border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-zinc-600 px-2 py-2 text-left print:text-black">
              Jméno
            </th>
            {WEEKS.map((week) => (
              <th
                key={week}
                className="border border-zinc-600 px-1 py-2 print:text-black"
              >
                {week}
              </th>
            ))}
            <th className="border border-zinc-600 px-2 py-2 print:text-black">
              Pozn.
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row}>
              <td className="h-9 border border-zinc-600 px-2" />
              {WEEKS.map((week) => (
                <td key={week} className="border border-zinc-600" />
              ))}
              <td className="border border-zinc-600" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HomeworkTable() {
  return (
    <div className="mt-8 overflow-x-auto">
      <p className="mb-3 text-sm text-zinc-400 print:text-zinc-700">
        Jméno: __________ · Skupina: __________
      </p>
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr className="text-left">
            <th className="border border-zinc-600 px-3 py-2 print:text-black">
              Týden
            </th>
            <th className="border border-zinc-600 px-3 py-2 print:text-black">
              Téma
            </th>
            <th className="border border-zinc-600 px-3 py-2 print:text-black">
              Úlohy v app
            </th>
            <th className="border border-zinc-600 px-3 py-2 print:text-black">
              List
            </th>
          </tr>
        </thead>
        <tbody>
          {HOMEWORK_WEEKS.map((theme, index) => (
            <tr key={theme}>
              <td className="border border-zinc-600 px-3 py-2 print:text-black">
                {index + 1}
              </td>
              <td className="border border-zinc-600 px-3 py-2 print:text-black">
                {theme}
              </td>
              <td className="h-10 border border-zinc-600" />
              <td className="border border-zinc-600" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Diploma() {
  return (
    <div className="mt-10 break-inside-avoid border-4 border-amber-700/80 px-8 py-16 text-center print:border-amber-800">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-600">
        {SCHOOL.name}
      </p>
      <h2 className="mt-6 text-4xl font-semibold tracking-tight print:text-black">
        Diplom
      </h2>
      <p className="mt-10 text-sm text-zinc-400 print:text-zinc-700">
        Tímto osvědčujeme, že
      </p>
      <p className="mt-6 border-b border-zinc-500 pb-2 text-xl print:text-black">
        ________________________________
      </p>
      <p className="mt-8 text-sm text-zinc-300 print:text-zinc-800">
        úspěšně dokončil(a) kurz Šachy od nuly.
      </p>
      <p className="mt-16 grid gap-8 text-sm sm:grid-cols-3 print:text-zinc-800">
        <span>
          Datum
          <br />
          __________
        </span>
        <span>
          Trenér
          <br />
          __________
        </span>
        <span>
          Razítko
          <br />
          __________
        </span>
      </p>
    </div>
  );
}

function PairingTable() {
  return (
    <div className="mt-8 space-y-8">
      <p className="text-sm text-zinc-400 print:text-zinc-700">
        Turnaj: __________ · Datum: __________ · Tempo: __________
      </p>
      {ROUNDS.map((round) => (
        <div key={round} className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold print:text-black">
            Kolo {round}
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-zinc-600 px-2 py-2 print:text-black">
                  Stůl
                </th>
                <th className="border border-zinc-600 px-2 py-2 print:text-black">
                  Bílý
                </th>
                <th className="border border-zinc-600 px-2 py-2 print:text-black">
                  Výsledek
                </th>
                <th className="border border-zinc-600 px-2 py-2 print:text-black">
                  Černý
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, index) => (
                <tr key={index}>
                  <td className="h-9 w-14 border border-zinc-600 px-2 print:text-black">
                    {index + 1}
                  </td>
                  <td className="border border-zinc-600" />
                  <td className="w-28 border border-zinc-600 text-center text-zinc-500">
                    1–0 / ½ / 0–1
                  </td>
                  <td className="border border-zinc-600" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
