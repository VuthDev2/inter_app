import { Suspense } from "react";
import SessionDetail from "@/components/SessionDetail";
export default function InsideRecordPage() { return <Suspense fallback={null}><SessionDetail /></Suspense>; }
