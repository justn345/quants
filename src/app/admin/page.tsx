import { notFound } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const { sb, user } = await currentUser();
  if (!user) notFound();
  const { data: me } = await sb.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) notFound();
  const db = adminClient();
  const [{ data: usage }, { count: users }, { count: alerts }, { count: sigs }] = await Promise.all([
    db.from("ai_usage").select("*").order("day", { ascending: false }).limit(42),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("alerts").select("id", { count: "exact", head: true }),
    db.from("signals").select("id", { count: "exact", head: true }),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <h1 className="display text-3xl font-black">Admin</h1>
      <div className="grid grid-cols-3 gap-4">{[["Users", users], ["Alerts", alerts], ["Signals", sigs]].map(([l, v]) => <div key={l as string} className="card p-4"><p className="label">{l}</p><p className="display num text-3xl font-black">{v ?? 0}</p></div>)}</div>
      <section className="card p-4">
        <h2 className="text-lg font-extrabold">NEAR AI calls per day</h2>
        <table className="num mt-3 w-full text-left text-sm"><thead><tr className="label"><th className="py-2">Day</th><th>Kind</th><th>Calls</th><th>Failures</th></tr></thead>
          <tbody className="divide-y divide-line">{(usage ?? []).map((u) => <tr key={`${u.day}${u.kind}`}><td className="py-2 font-semibold">{u.day}</td><td>{u.kind}</td><td className="font-bold">{u.calls}</td><td>{u.failures}</td></tr>)}</tbody></table>
      </section>
    </main>
  );
}
