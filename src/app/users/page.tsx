// app/users/page.tsx
import { Suspense } from "react";
import UsersAdminPage from "@/components/users/UsersAdminPage";

// (optional) avoid static prerendering for this page
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-top-[#EF3340] rounded-full animate-spin" />
          </div>
        </main>
      }
    >
      <UsersAdminPage />
    </Suspense>
  );
}
