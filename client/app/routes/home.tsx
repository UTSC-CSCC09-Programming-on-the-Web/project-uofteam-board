import { useNavigate } from "react-router";
import { PiPencilDuotone } from "react-icons/pi";
import { Button } from "~/components";

export function meta() {
  return [{ title: "UofTeam Board" }];
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center">
      <div className="container mx-auto px-4 flex flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold">
          Welcome to{" "}
          <span className="text-blue-800 underline underline-offset-6">UofTeam Board</span>
          <PiPencilDuotone className="inline text-blue-800 text-5xl" />
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          A real-time collaborative canvas with AI-powered drawing completion—create, share, and
          enhance artwork together.
        </p>
        <div className="flex gap-4 mt-8">
          <Button label="Sign up" onClick={() => navigate("/signup")} />
          <Button label="Log in" onClick={() => navigate("/login")} variant="neutral" />
        </div>
      </div>
    </div>
  );
}
