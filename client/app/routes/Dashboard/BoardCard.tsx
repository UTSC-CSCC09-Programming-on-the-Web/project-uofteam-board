import { Chip } from "~/components";

interface BoardCardChipProps {
  label: string;
  value: string;
}

interface BoardCardProps {
  title: string;
  imageURL: string;
  chips: BoardCardChipProps[];
  onClick: () => void;
}

const BoardCard = ({ title, imageURL, chips, onClick }: BoardCardProps) => (
  <div
    onClick={onClick}
    className="bg-white border-gray-500 border-2 rounded-organic-md overflow-hidden cursor-pointer clickable-offset-shadow-lg shadow-yellow-950/20"
  >
    <div className="flex items-center px-3 py-2 sm:py-3 md:px-4 md:py-4 border-b-2 border-gray-500">
      <h2 className="text-md sm:text-lg md:text-xl font-semibold line-clamp-1">{title}</h2>
    </div>
    <div className="relative">
      <img
        src={imageURL}
        alt={`Preview of "${title}"`}
        className="w-full h-[256px] sm:h-[320px] object-cover"
        onError={(e) => {
          e.currentTarget.src = "https://placehold.co/300x200?text=No+Preview+Available";
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-wrap justify-end gap-2">
        {chips.map((x) => (
          <Chip key={x.label} variant="primary">
            <span className="opacity-60 mr-1">{x.label}:</span>
            {x.value}
          </Chip>
        ))}
      </div>
    </div>
  </div>
);

export { BoardCard, type BoardCardProps, type BoardCardChipProps };
