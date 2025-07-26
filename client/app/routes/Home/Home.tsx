import clsx from "clsx";
import { useSearchParams } from "react-router";
import { PiPencilDuotone } from "react-icons/pi";
import { AiFillGoogleCircle } from "react-icons/ai";

import { Button } from "~/components";
import { API } from "~/services";

import type { Route } from "./+types/Home";
import styles from "./Home.module.css";

const meta: Route.MetaFunction = () => [{ title: "UofTeam Board" }];

const errorMap = {
  auth_failed: "Login failed. Please try again or contact the project team.",
  not_logged_in: "You must be logged in before you access that page.",
  unknown: "An unexpected error occurred. Please try again.",
};

const Home = () => {
  const [query] = useSearchParams();
  const error = query.get("error");

  const handleLogin = () => {
    window.location.href = API.getLoginRedirectUrl();
  };

  return (
    <div className="h-screen flex justify-center items-center bg-yellow-100">
      <div className={clsx("absolute inset-0", styles["grid-background"])} />
      <div className="absolute inset-0 bg-radial from-yellow-50 to-transparent" />
      <div className="z-10 px-4 pb-16 flex flex-col items-center text-center max-w-3xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-blue-800 font-extrabold relative">
          <span className={styles.underline}>UofTeam Board</span>
          <PiPencilDuotone className={clsx("text-4xl sm:text-5xl md:text-6xl", styles.logo)} />
        </h1>
        <p className="mt-4 sm:mt-6 md:mt-8 text-lg md:text-xl text-gray-600">
          A real-time collaborative canvas with AI-powered drawing completion—create, share, and
          enhance artwork together.
        </p>
        <Button icon={<AiFillGoogleCircle />} onClick={handleLogin} className="mt-8 sm:mt-12">
          Log in with Google
        </Button>
        {error && (
          <p className="mt-4 text-red-600 text-sm">
            {errorMap[error in errorMap ? (error as keyof typeof errorMap) : "unknown"]}
          </p>
        )}
      </div>
    </div>
  );
};

export { Home as default, meta };
