import type { Route } from "./+types/EditBoard";

export function meta() {
  return [{ title: "Edit Board" }];
}

export async function clientLoader() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return;
}

export default function EditBoard({ params }: Route.ComponentProps) {
  return <p>Load up board {params.bid}</p>;
}
