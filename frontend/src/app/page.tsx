import type { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import type { Election, ElectionStats, DossierRow } from "@/lib/api";
import OverviewClient, { type OverviewInitialData } from "./OverviewClient";

export const metadata: Metadata = {
  title: "Overview - मतदान iQ | India's Booth-Level Voter Intelligence",
  description: "Election countdown, geospatial mapping, candidate intelligence, and voter demographics for Indian state elections. Booth-level data from ECI.",
};

export default async function OverviewPage() {
  let initialData: OverviewInitialData | undefined;

  try {
    // Fetch elections and pick the latest one (sorted by year desc)
    const elections = await serverFetch<Election[]>("/overview/elections");
    const latest = elections.sort((a, b) => b.year - a.year)[0];

    if (latest) {
      const eid = `election_id=${latest.id}`;

      const [
        stats,
        dossier,
        partyPerformance,
        turnoutByDistrict,
        marginDistribution,
        categoryMix,
        historicalWave,
        closestContests,
        notaImpact,
        crorepati,
        genderDemo,
        educationData,
        criminalData,
        marginTurnout,
        countdown,
        placesToWatch,
        swingAnalysis,
      ] = await Promise.all([
        serverFetch<ElectionStats>(`/overview/stats?${eid}`),
        serverFetch<DossierRow[]>(`/overview/dossier-table?${eid}&limit=20&offset=0`),
        serverFetch<any[]>(`/overview/party-performance?${eid}`),
        serverFetch<any[]>(`/overview/turnout-by-district?${eid}`),
        serverFetch<any[]>(`/overview/vote-margin-distribution?${eid}`),
        serverFetch<any[]>(`/overview/category-mix?${eid}`),
        serverFetch<any>(`/overview/historical-wave?${eid}`),
        serverFetch<any[]>(`/overview/closest-contests?${eid}&limit=10`),
        serverFetch<any[]>(`/overview/nota-impact?${eid}`),
        serverFetch<any>(`/overview/crorepati-candidates?${eid}`),
        serverFetch<any[]>(`/overview/gender-demographics?${eid}`),
        serverFetch<any[]>(`/overview/education-breakdown?${eid}`),
        serverFetch<any>(`/overview/criminal-overview?${eid}`),
        serverFetch<any[]>(`/overview/margin-vs-turnout?${eid}`),
        serverFetch<any>(`/overview/countdown?${eid}`),
        serverFetch<any[]>(`/overview/places-to-watch?${eid}`),
        serverFetch<any[]>(`/overview/swing-analysis?${eid}`),
      ]);

      initialData = {
        stats,
        dossier,
        partyPerformance,
        turnoutByDistrict,
        marginDistribution,
        categoryMix,
        historicalWave,
        closestContests,
        notaImpact,
        crorepati,
        genderDemo,
        educationData,
        criminalData,
        marginTurnout,
        countdown,
        placesToWatch,
        swingAnalysis,
      };
    }
  } catch (err) {
    // Graceful fallback: render without initialData, client will fetch
    console.error("[SSR] Failed to fetch overview data:", err);
  }

  return <OverviewClient initialData={initialData} />;
}
