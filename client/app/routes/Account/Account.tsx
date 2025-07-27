import { useCallback, useEffect, useMemo, useState } from "react";
import { MdOutlineAccountCircle, MdOutlineEmail } from "react-icons/md";
import { LuCrown, LuFingerprint } from "react-icons/lu";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import clsx from "clsx";

import type { User } from "~/types";
import { API } from "~/services";
import { extractInitials, sleep } from "~/utils";

import type { Route } from "./+types/Account";
import { ErrorState } from "./ErrorState";
import { LoadingText } from "./LoadingText";
import { Chip } from "~/components";

const meta: Route.MetaFunction = () => [{ title: "Account" }];

const Account = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    // Sleep ensures the loading state is not visually jarring
    const [, res] = await Promise.all([sleep(1000), API.getMe()]);
    if (res.error !== null) {
      if (res.status === 401) {
        navigate("/?error=not_logged_in");
      } else {
        toast(`Failed to fetch user:\n ${res.error}`);
        setError(res.error);
        setLoading(false);
      }
      return;
    }

    setUser(res.data);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const view = useMemo(
    () => ({
      name: user ? user.name : <LoadingText size="w-[12ch]" />,
      initials: user ? extractInitials(user.name) : "",
      detailRows: [
        {
          label: "Name",
          icon: <MdOutlineAccountCircle />,
          value: user ? user.name : <LoadingText size="w-[12ch]" />,
        },
        {
          label: "Email",
          icon: <MdOutlineEmail />,
          value: user ? user.email : <LoadingText size="w-[16ch]" />,
        },
        {
          label: "User ID",
          icon: <LuFingerprint />,
          value: user ? `#${user.id}` : <LoadingText size="w-[4ch]" />,
        },
        {
          label: "Subscription",
          icon: <LuCrown />,
          value: user ? (
            <Chip variant="success" className="sm:-mt-1">
              Active
            </Chip>
          ) : (
            <LoadingText size="w-[8ch]" />
          ),
        },
      ],
    }),
    [user],
  );

  return error ? (
    <ErrorState onRetry={fetchUser} retrying={loading} />
  ) : (
    <div className="flex flex-col items-center text-center mt-4">
      <span
        className={clsx(
          loading && "animate-pulse",
          "size-24 flex items-center justify-center rounded-full bg-blue-100 border-4 border-dashed border-blue-800/40 text-4xl text-blue-800 font-extrabold",
        )}
      >
        {view.initials}
      </span>
      <h3 className="text-3xl font-bold mt-6">{view.name}</h3>
      <h1 className="text-lg text-gray-400 mt-1">Account details</h1>
      <div className="mt-6 w-full max-w-xl p-4 sm:p-8 flex flex-col gap-4 sm:gap-8 bg-white border-2 border-gray-400 offset-shadow-lg shadow-gray-950/15 rounded-organic-lg text-left">
        {view.detailRows.map((row) => (
          <div key={row.label} className="flex items-start">
            <div className="p-2 bg-gray-100 rounded-xl text-gray-500 text-2xl">{row.icon}</div>
            <div className="ml-4 mt-2 flex flex-col items-start gap-1 sm:gap-0 sm:flex-row">
              <span className="text-gray-500 sm:w-32">{row.label}</span>
              <span className="text-gray-800 font-medium">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { Account as default, meta };
