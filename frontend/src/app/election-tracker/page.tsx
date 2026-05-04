import { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import ElectionTrackerClient from "./ElectionTrackerClient";

export const metadata: Metadata = {
  title: "Election Tracker — मतदान iQ | Constituency-Level Results",
  description: "Track constituency-level election results, candidate performance, party tallies, and voter turnout across Indian state assembly elections.",
};

export default async function ElectionTrackerPage() {
  let initialData: { data: any[] } | undefined;

  try {
    const elections = await serverFetch<any[]>("/overview/elections");
    const sorted = [...elections].sort((a, b) => b.year - a.year);
    const latest = sorted[0];

    if (latest) {
      const data = await serverFetch<any[]>(
        `/overview/constituency-tracker?election_id=${latest.id}`
      );
      initialData = { data };
    }
  } catch (e) {
    // SSR fetch failed — client will hydrate with empty state
  }

  return <ElectionTrackerClient initialData={initialData} />;
}
