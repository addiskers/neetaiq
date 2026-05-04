import type { Metadata } from "next";
import LiveElectionClient from "./LiveElectionClient";

export const metadata: Metadata = {
  title: "Live Election Results — मतदान iQ | Real-Time ECI Vote Count",
  description:
    "Live election results from the Election Commission of India. Real-time party-wise seat tally, constituency results, and interactive map.",
};

export default function LiveElectionPage() {
  return <LiveElectionClient />;
}
