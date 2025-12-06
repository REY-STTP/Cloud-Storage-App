// app/dashboard/profile/page.tsx
import React, { Suspense } from "react";
import dynamic from "next/dynamic";

const ClientProfile = dynamic(() => import("./ClientProfile"), { ssr: false });

export default function Page() {
  return (
    <main>
      <Suspense fallback={<div className="p-4">Loading profile...</div>}>
        <ClientProfile />
      </Suspense>
    </main>
  );
}
