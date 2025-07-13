import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useDebouncedCallback } from "use-debounce";
import { Spinner, TextInput } from "~/components";

interface QueryInputProps {
  loading: boolean;
  onChange: (value: string) => void;
  className?: string;
}

function QueryInput({ loading, onChange, className }: QueryInputProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedCallback(onChange, 500);

  return (
    <TextInput
      type="text"
      name="search"
      placeholder="Search your boards..."
      icon={loading ? <Spinner className="border-3" /> : <FiSearch />}
      containerClassName={className}
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        debounced(e.target.value);
      }}
    />
  );
}

export { QueryInput, type QueryInputProps };
