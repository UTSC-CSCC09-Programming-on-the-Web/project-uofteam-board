import { FiSearch } from "react-icons/fi";
import { useDebouncedCallback } from "use-debounce";
import { Spinner, TextInput } from "~/components";

interface QueryInputProps {
  loading: boolean;
  onChange: (value: string) => void;
  className?: string;
}

const QueryInput = ({ loading, onChange, className }: QueryInputProps) => {
  const debounced = useDebouncedCallback(onChange, 500);

  return (
    <TextInput
      type="text"
      name="search"
      placeholder="Search your boards..."
      icon={loading ? <Spinner className="border-3" /> : <FiSearch />}
      onChange={(e) => debounced(e.target.value)}
      containerClassName={className}
    />
  );
};

export { QueryInput, type QueryInputProps };
