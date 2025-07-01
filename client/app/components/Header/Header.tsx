import { useState } from "react";
import { Link, NavLink } from "react-router";
import { FiMenu } from "react-icons/fi";
import { PiPencilDuotone } from "react-icons/pi";
import { Button, type ButtonProps } from "../Button";
import clsx from "clsx";

interface HeaderLinkProps {
  label: string;
  to: string;
}

interface HeaderButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
}

interface HeaderProps {
  links: HeaderLinkProps[];
  buttons: HeaderButtonProps[];
}

function Header({ links, buttons }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const toggleMenu = () => setOpen((open) => !open);

  return (
    <header className="bg-yellow-100 border border-yellow-800/20 text-blue-800">
      <div className="container mx-auto flex flex-col md:flex-row">
        <div className="flex items-center pl-4 md:pr-4 justify-between h-[56px] md:h-[72px]">
          <Link to="/dashboard">
            <h1 className="text-xl md:text-2xl font-extrabold">
              <span className="underline underline-offset-6 decoration-blue-900">
                UofTeam Board
              </span>
              <PiPencilDuotone className="inline text-3xl md:text-4xl" />
            </h1>
          </Link>
          <button
            onClick={toggleMenu}
            className="size-[56px] bg-blue-800 hover:bg-blue-900 transition-colors hover:cursor-pointer flex items-center justify-center md:hidden"
          >
            <FiMenu className="text-white text-2xl md:text-4xl" />
          </button>
        </div>
        <div
          className={clsx(
            "flex-col px-4 pb-3 md:flex-row md:flex md:flex-1 md:justify-between md:items-center md:pb-0",
            open ? "flex" : "hidden",
          )}
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            {links.map((x) => (
              <NavLink
                key={x.to}
                to={x.to}
                className={({ isActive }) => clsx(isActive && "font-bold")}
              >
                {x.label}
              </NavLink>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-4 md:flex-row md:pt-0">
            {buttons.map((x) => (
              <Button key={x.label} size="sm" {...x}>
                {x.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export { Header, type HeaderProps, type HeaderLinkProps, type HeaderButtonProps };
