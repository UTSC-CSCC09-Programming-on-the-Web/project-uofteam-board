export function meta() {
  return [{ title: "Account" }];
}

export async function clientLoader() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return;
}

export default function EditBoard() {
  return <p>Load up account</p>;
}
