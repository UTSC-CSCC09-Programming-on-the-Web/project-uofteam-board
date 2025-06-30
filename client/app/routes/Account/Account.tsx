import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import type { User } from "~/types";
import { API } from "~/services";

export function meta() {
  return [{ title: "Account" }];
}

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await API.getMe();
      if (res.error !== null) {
        if (res.status === 401) navigate("/");
        else alert(`Error fetching user: ${res.error}`);
        return;
      }

      setUser(res.data);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 pt-8 pb-16">
      {user ? (
        <>
          <p>Loaded user</p>
          <div className="mt-4 flex flex-col gap-2">
            <p>ID: {user.id}</p>
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
          </div>
        </>
      ) : (
        <p>Loading user...</p>
      )}
    </div>
  );
}
