export function meta() {
  return [{ title: "Login" }];
}

export default function Login() {
  console.log("Testing here");
  window.location.href = "http://localhost:4000/auth/google";
  return <p>Loginnnnnnn</p>;
}