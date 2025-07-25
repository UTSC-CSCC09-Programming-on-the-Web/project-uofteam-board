import clsx from "clsx";
import { useState } from "react";
import { Outlet, useNavigate, useNavigation } from "react-router";
import { Header } from "~/components";
import { API } from "~/services";

import styles from "./Layout.module.css";

export default function Layout() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="min-h-screen bg-yellow-50">
      <Header
        links={[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/account", label: "Account" },
        ]}
        buttons={[
          {
            label: "Sign out",
            variant: "neutral",
            loading: signingOut,
            onClick: async () => {
              setSigningOut(true);
              const res = await API.postLogout();
              if (res.error !== null) {
                alert(`Logout failed: ${res.error}`);
                setSigningOut(false);
                return;
              }

              navigate("/");
              setSigningOut(false);
            },
          },
        ]}
      />
      {navigation.state === "loading" && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-yellow-800/10">
          <div
            className={clsx(
              "h-full w-1/3 bg-gradient-to-r from-transparent via-yellow-800 to-transparent",
              styles.progressBar,
            )}
          />
        </div>
      )}
      <div className="container mx-auto px-4 pt-8 pb-16">
        <Outlet />
      </div>
    </div>
  );
}
