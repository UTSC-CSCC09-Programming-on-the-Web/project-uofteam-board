import clsx from "clsx";
import { Outlet, useNavigate, useNavigation } from "react-router";
import { Header } from "~/components";
import styles from "./Layout.module.css";

export default function Layout() {
  const navigate = useNavigate();
  const navigation = useNavigation();

  return (
    <div className="min-h-screen bg-yellow-50">
      <Header
        links={[
          { to: "/boards/mine", label: "My boards" },
          { to: "/boards/public", label: "Public boards" },
        ]}
        buttons={[
          {
            label: "Account",
            variant: "neutral",
            onClick: () => navigate("/account"),
          },
        ]}
      />
      {navigation.state === "loading" && (
        <div className="fixed top-0 left-0 right-0 h-1">
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
