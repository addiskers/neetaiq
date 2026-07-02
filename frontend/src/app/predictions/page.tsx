import type { Metadata } from "next";
import { serverFetch } from "@/lib/server-api";
import PredictionsClient from "./PredictionsClient";

export const metadata: Metadata = {
  title: "AI Predictions - मतदान iQ | ML-Powered Election Forecasts",
  description: "AI-powered constituency-level election predictions using GradientBoosting models trained on historical data, demographics, and candidate profiles.",
};

export default async function PredictionsPage() {
  let initialData: { summary: any; predictions: any[]; battlegrounds: any[] } | undefined;

  try {
    const [summary, predictions, battlegrounds] = await Promise.all([
      serverFetch<any>("/predictions/summary"),
      serverFetch<any[]>("/predictions/constituencies"),
      serverFetch<any[]>("/predictions/battlegrounds?limit=12"),
    ]);
    initialData = { summary, predictions, battlegrounds };
  } catch {
    // SSR fetch failed — client will re-fetch via useEffect
  }

  return <PredictionsClient initialData={initialData} />;
}
