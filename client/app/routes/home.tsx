import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta() {
  return [{ title: "UofTeam Board" }];
}

export default function Home() {
  return <p>Home</p>;
}
