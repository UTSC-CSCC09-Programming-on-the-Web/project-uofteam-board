export function meta() {
  return [{ title: "Login" }];
}

export default function Logout() {
  console.log("Testing here");
  window.location.href = "http://localhost:4000/auth/logout";
  return <p>Logouttt</p>;
}