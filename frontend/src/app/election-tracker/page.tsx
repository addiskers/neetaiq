import { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import { pickDefaultElection, toStateSlug } from "@/lib/api";
import type { Election } from "@/lib/api";
import ElectionTrackerClient from "./ElectionTrackerClient";

export const metadata: Metadata = {
  title: "Election Tracker - मतदान iQ | Constituency-Level Results",
  description: "Track constituency-level election results, candidate performance, party tallies, and voter turnout across Indian state assembly elections.",
};

export default async function ElectionTrackerPage() {
  let initialData: { data: any[] } | undefined;

  try {
    // all-elections, not elections: the latter is state-scoped and returned
    // West Bengal's list when called without a state, so this page could only
    // ever server-render West Bengal's constituencies.
    const elections = await serverFetch<Election[]>("/overview/all-elections");
    const latest = pickDefaultElection(elections);

    if (latest) {
      const state = encodeURIComponent(toStateSlug(latest.state));
      const data = await serverFetch<any[]>(
        `/overview/constituency-tracker?election_id=${latest.id}&state=${state}`
      );
      initialData = { data };
    }
  } catch (e) {
    // SSR fetch failed — client will hydrate with empty state
  }

  return <ElectionTrackerClient initialData={initialData} />;
}
