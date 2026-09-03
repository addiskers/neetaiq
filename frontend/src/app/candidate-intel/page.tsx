import type { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import { pickDefaultElection, toStateSlug } from "@/lib/api";
import type { Election, CandidateBrief, CandidateDetail } from "@/lib/api";
import CandidateIntelClient from "./CandidateIntelClient";

export const metadata: Metadata = {
  title: "Candidate Database - मतदान iQ | Candidate Intelligence",
  description:
    "Search and explore candidate profiles with verified financials, cases, education, and vote share data from ECI affidavits.",
};

export default async function CandidateIntelPage() {
  let candidates: CandidateBrief[] = [];
  let selected: CandidateDetail | null = null;

  try {
    // all-elections, not elections: the latter is state-scoped and returned
    // West Bengal's list when called without a state, so this page could only
    // ever server-render West Bengal's candidates whatever the client selected.
    const elections = await serverFetch<Election[]>("/overview/all-elections");
    const latest = pickDefaultElection(elections);

    if (latest) {
      const state = encodeURIComponent(toStateSlug(latest.state));
      candidates = await serverFetch<CandidateBrief[]>(
        `/candidates?election_id=${latest.id}&state=${state}&exclude_nota=true&limit=2000`
      );

      if (candidates.length > 0) {
        selected = await serverFetch<CandidateDetail>(
          `/candidates/${candidates[0].id}?state=${state}`
        );
      }
    }
  } catch (e) {
    // Graceful fallback — client component will fetch on mount
    console.error("SSR fetch failed for candidate-intel:", e);
  }

  return (
    <CandidateIntelClient
      initialData={{ candidates, selected }}
    />
  );
}
