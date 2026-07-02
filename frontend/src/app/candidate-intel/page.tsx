import type { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import type { Election, CandidateBrief, CandidateDetail } from "@/lib/api";
import CandidateIntelClient from "./CandidateIntelClient";

export const metadata: Metadata = {
  title: "Candidate Database — मतदान iQ | Candidate Intelligence",
  description:
    "Search and explore candidate profiles with verified financials, cases, education, and vote share data from ECI affidavits.",
};

export default async function CandidateIntelPage() {
  let candidates: CandidateBrief[] = [];
  let selected: CandidateDetail | null = null;

  try {
    const elections = await serverFetch<Election[]>("/overview/elections");
    const sorted = [...elections].sort((a, b) => b.year - a.year);
    const latest = sorted[0];

    if (latest) {
      candidates = await serverFetch<CandidateBrief[]>(
        `/candidates?election_id=${latest.id}&exclude_nota=true&limit=2000`
      );

      if (candidates.length > 0) {
        selected = await serverFetch<CandidateDetail>(
          `/candidates/${candidates[0].id}`
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
