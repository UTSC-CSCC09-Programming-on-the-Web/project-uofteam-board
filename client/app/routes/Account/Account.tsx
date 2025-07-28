import { useCallback, useEffect, useState } from "react";
import { MdOutlineAccountCircle, MdOutlineEmail } from "react-icons/md";
import { LuCrown, LuFingerprint } from "react-icons/lu";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import clsx from "clsx";

import { API } from "~/services";
import { Button, Chip } from "~/components";
import { extractInitials, sleep } from "~/utils";
import type { User } from "~/types";

import type { Route } from "./+types/Account";
import { ErrorState } from "./ErrorState";
import { LoadingText } from "./LoadingText";
import { DetailRow } from "./DetailRow";

const meta: Route.MetaFunction = () => [{ title: "Account" }];

const Account = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSubscribe = async () => {
    if (!user) return;
    setIsSubmitting(true);
    const res = await API.createStripeCheckoutSession();
    if (res.error != null) {
      toast(`Failed to initiate subscription:\n ${res.error}`);
      setIsSubmitting(false);
      return;
    }

    window.location.href = res.data.url;
  };

  const handleManageSubscription = async () => {
    setIsSubmitting(true);
    const res = await API.createStripePortalSession();
    if (res.error != null) {
      toast(`Failed to open subscription portal:\n ${res.error}`);
      setIsSubmitting(false);
      return;
    }

    window.location.href = res.data.url;
  };

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
        {user ? extractInitials(user.name) : ""}
      </span>
      <h3 className="text-3xl font-bold mt-6">
        {user ? user.name : <LoadingText size="w-[12ch]" />}
      </h3>
      <h1 className="text-lg text-gray-500 mt-1">Your account details</h1>
      <div className="mt-6 w-full max-w-xl p-4 sm:p-8 flex flex-col gap-4 sm:gap-8 bg-white border-2 border-gray-400 offset-shadow-lg shadow-gray-950/15 rounded-organic-lg">
        <DetailRow
          label="Name"
          icon={<MdOutlineAccountCircle />}
          value={user ? user.name : <LoadingText size="w-[12ch]" />}
        />
        <DetailRow
          label="Email"
          icon={<MdOutlineEmail />}
          value={user ? user.email : <LoadingText size="w-[16ch]" />}
        />
        <DetailRow
          label="User ID"
          icon={<LuFingerprint />}
          value={user ? `#${user.id}` : <LoadingText size="w-[4ch]" />}
        />
        <DetailRow
          label="Subscription"
          icon={<LuCrown />}
          value={
            user ? (
              <Chip variant={user.paid ? "success" : "danger"} className="mt-1 sm:-mt-1">
                {user.paid ? "Active" : "Missing"}
              </Chip>
            ) : (
              <LoadingText size="w-[8ch]" />
            )
          }
          extraContent={
            user ? (
              <div className="flex flex-col items-start">
                <span className="text-gray-600 text-sm mb-4 max-w-sm">
                  {user.paid ? "You are subscribed!" : "Subscribe to use the application!"} All
                  payments for UofTeam Board are processed securely via Stripe.
                </span>
                {user.paid ? (
                  <Button
                    variant="neutral"
                    onClick={handleManageSubscription}
                    loading={isSubmitting}
                    size="sm"
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    icon={<LuCrown />}
                    loading={isSubmitting}
                    onClick={handleSubscribe}
                    size="sm"
                  >
                    Subscribe
                  </Button>
                )}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
};

export { Account as default, meta };
