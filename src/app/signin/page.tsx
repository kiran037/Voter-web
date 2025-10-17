// src/app/signin/page.tsx
import { Suspense } from "react";
import SignInClient from "./SignInClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center p-8">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3340] rounded-full animate-spin" />
        </main>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
