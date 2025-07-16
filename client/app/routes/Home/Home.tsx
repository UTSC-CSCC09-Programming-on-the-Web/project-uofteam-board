import { useSearchParams } from "react-router";
import { PiPencilDuotone } from "react-icons/pi";
import { AiFillGoogleCircle } from "react-icons/ai";
import { Button } from "~/components";
import { API } from "~/services";

export function meta() {
  return [{ title: "UofTeam Board" }];
}

export default function Home() {
  const [query] = useSearchParams();

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center">
      <div className="container mx-auto px-4 flex flex-col items-center text-center max-w-[768px]">
        <h1 className="text-3xl md:text-4xl text-blue-800 font-extrabold">
          <span className="underline underline-offset-6 decoration-blue-900">UofTeam Board</span>
          <PiPencilDuotone className="inline text-4xl md:text-5xl" />
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600">
          A real-time collaborative canvas with AI-powered drawing completion—create, share, and
          enhance artwork together.
        </p>
        <Button
          icon={<AiFillGoogleCircle />}
          onClick={() => (window.location.href = API.getLoginRedirectUrl())}
          className="mt-10"
        >
          Log in with Google
        </Button>
        {query.get("error") === "auth_failed" && (
          <p className="mt-4 text-red-600 text-sm">
            Login failed. Please try again or contact the project team.
          </p>
        )}
      </div>
    </div>
  );
}
