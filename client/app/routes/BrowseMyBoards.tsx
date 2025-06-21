import { FiSearch, FiPlus } from "react-icons/fi";
import { BoardCard, Button } from "~/components";
import { useNavigate } from "react-router";

export function meta() {
  return [{ title: "My Boards" }];
}

export async function clientLoader() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return;
}

export default function BrowseMyBoards() {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-extrabold text-blue-800">My boards</h1>
        <Button icon={<FiPlus />} size="sm">
          New board
        </Button>
      </div>
      <div className="relative mt-4">
        <FiSearch className="absolute h-full w-6 ml-3 pointer-events-none text-gray-500" />
        <input
          type="text"
          name="search"
          placeholder="Search your boards..."
          className="w-full pl-11 pr-4 py-2 text-md md:text-lg bg-blue-100/50 border-2 border-gray-400 rounded-lg rounded-tl-[255px_25px] rounded-tr-[25px_225px] rounded-br-[225px_25px] rounded-bl-[25px_255px]"
        />
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3 mt-4 sm:mt-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => (
          <BoardCard
            key={x}
            title={`Board ${x}`}
            imageURL="https://placehold.co/300x200"
            onClick={() => navigate(`/boards/${x}`)}
            chips={[
              {
                label: "Visibility",
                value: x % 2 === 0 ? "Public" : "Private",
              },
              {
                label: "Modified",
                value: new Date().toLocaleString([], {
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }),
              },
            ]}
          />
        ))}
      </div>
    </>
  );
}
