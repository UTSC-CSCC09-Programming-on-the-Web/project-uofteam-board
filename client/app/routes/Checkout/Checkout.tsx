import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { GiPartyPopper } from "react-icons/gi";
import { FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";

import { Button, Spinner } from "~/components";
import { API } from "~/services";

import type { Route } from "./+types/Checkout";

const meta: Route.MetaFunction = () => [{ title: "Checkout" }];

type SubscriptionStatus = "polling" | "success" | "timeout";
const statusMessages: Record<SubscriptionStatus, string> = {
  polling: "Waiting for subscription confirmation...",
  success: "Subscription confirmed! Redirecting to dashboard...",
  timeout: "We're having trouble confirming your subscription. Please try again later.",
};

const redirectDelayMs = 3000; // 3 seconds
const pollingIntervalMs = 5000; // 5 seconds
const timeoutLimitMs = 60000; // 1 minute
const initialDelayMs = 1000; // 1 second

const Checkout = () => {
  const navigate = useNavigate();
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus>("polling");

  useEffect(() => {
    const startTime = Date.now();
    const poll = async () => {
      if (Date.now() - startTime > timeoutLimitMs) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStatus("timeout");
        return;
      }

      const res = await API.getMe();

      if (res.status === 401) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        navigate("/?error=not_logged_in");
        return;
      } else if (res.error !== null) {
        toast(`Failed to fetch user:\n ${res.error}`);
        return;
      }

      if (res.data.paid) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setTimeout(() => navigate("/dashboard"), redirectDelayMs);
        setStatus("success");
        return;
      }

      pollingRef.current = setTimeout(poll, pollingIntervalMs);
    };

    pollingRef.current = setTimeout(poll, initialDelayMs);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => clearTimeout(pollingRef.current!);
  }, [navigate]);

  return (
    <div className="pt-24 flex justify-center items-center">
      <div className="max-w-sm flex flex-col items-center text-center text-yellow-700/60">
        {status === "polling" && <Spinner className="size-24 border-12" />}
        {status === "timeout" && <FaTimes className="size-24 opacity-75" />}
        {status === "success" && <GiPartyPopper className="size-24 opacity-75" />}
        <div className="text-gray-500 mt-8">{statusMessages[status]}</div>
        {status === "timeout" && (
          <Button className="mt-8" onClick={() => navigate("/account")} size="sm">
            Go to Account
          </Button>
        )}
      </div>
    </div>
  );
};

export { Checkout as default, meta };
