import SignIn from "@/components/auth/SignIn";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="h-screen overflow-hidden grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <SignIn />
      </div>
      <div className="hidden lg:block relative bg-red-10">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <Image
            src="/images/kortrijk-xpo-logo-white.svg"
            alt="Kortrijk Xpo Logo"
            width={250}
            height={72}
            className="mb-12"
          />
          <h1 className="text-white text-6xl font-semibold">Dashboard</h1>
        </div>
        <svg
          className="absolute bottom-0 left-0 w-full h-auto"
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
        >
          <path d="M0,150 L500,50 L500,150 L0,150 Z" className="fill-red-10" />
        </svg>
      </div>
    </div>
  );
}
