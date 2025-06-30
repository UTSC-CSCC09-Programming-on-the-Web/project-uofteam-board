import clsx from "clsx";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useDebouncedCallback } from "use-debounce";
import { Spinner } from "~/components";

interface QueryInputProps {
  loading: boolean;
  onChange: (value: string) => void;
  className?: string;
}

function QueryInput({ loading, onChange, className }: QueryInputProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedCallback(onChange, 500);

  return (
    <div className={clsx("relative mt-4", className)}>
      <div className="absolute h-full flex flex-col justify-center ml-3 pointer-events-none text-gray-500">
        {loading ? <Spinner className="size-6 border-3" /> : <FiSearch className="size-6" />}
      </div>
      <input
        type="text"
        name="search"
        placeholder="Search your boards..."
        className="w-full pl-11 pr-4 py-2 text-md md:text-lg bg-blue-100/50 border-2 border-gray-400 rounded-lg rounded-tl-[255px_25px] rounded-tr-[25px_225px] rounded-br-[225px_25px] rounded-bl-[25px_255px]"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          debounced(e.target.value);
        }}
      />
    </div>
  );
}

export { QueryInput, type QueryInputProps };
