import type { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  extraContent?: ReactNode;
}

const DetailRow = ({ label, icon, value, extraContent }: DetailRowProps) => (
  <div className="flex flex-wrap items-start text-left">
    <div className="p-2 bg-gray-100 rounded-xl text-gray-500 text-2xl">{icon}</div>
    <div className="ml-4 mt-2 flex flex-col items-start gap-1 sm:gap-0 sm:flex-row">
      <span className="text-gray-500 sm:w-32">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
    {extraContent && <div className="ml-14 mt-2 basis-full">{extraContent}</div>}
  </div>
);

export { DetailRow, type DetailRowProps };
