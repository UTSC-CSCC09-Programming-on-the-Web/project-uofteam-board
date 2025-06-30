import clsx from "clsx";
import { Outlet, useNavigation } from "react-router";
import { Header } from "~/components";
import { API } from "~/services";

import styles from "./Layout.module.css";

export default function Layout() {
  const navigation = useNavigation();

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      <Header
        links={[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/account", label: "Account" },
        ]}
        buttons={[
          {
            label: "Sign out",
            variant: "neutral",
            onClick: () => (window.location.href = API.getLogoutRedirectUrl()),
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
      <Outlet />
    </div>
  );
}
