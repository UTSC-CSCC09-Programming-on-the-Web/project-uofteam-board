import { useNavigate } from "react-router";
import { PiPencilDuotone } from "react-icons/pi";
import { AiFillGoogleCircle } from "react-icons/ai";
import { Button } from "~/components";

export function meta() {
  return [{ title: "UofTeam Board" }];
}

export default function Home() {
  const navigate = useNavigate();

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
        <div className="flex gap-4 mt-10">
          <Button icon={<AiFillGoogleCircle size="1.3em" />} onClick={() => navigate("/dashboard")}>
            Log in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
