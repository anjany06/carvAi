import { getUserOnboardingStatus } from "@/actions/user";
import { Loader } from "lucide-react";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { HashLoader } from "react-spinners";

const Layout = async ({ children }) => {
  // if user is not onboarded Redirect to OnBoarding..
  const { isOnboarded } = await getUserOnboardingStatus();

  if (!isOnboarded) {
    redirect("/onboarding");
  }
  return (
    <div className="px-5">
      <Suspense
        fallback={
          <div className="loader-container">
            <Loader className="mt-4 h-12 w-12 animate-spin" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

export default Layout;
