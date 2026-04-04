import type { JSX } from "react";

type InkDoodleVariant = "bookmark" | "loop" | "spark" | "underline";

type InkDoodleProps = {
  className?: string;
  variant: InkDoodleVariant;
};

const doodlePaths: Record<
  InkDoodleVariant,
  {
    path: string;
    viewBox: string;
  }
> = {
  bookmark: {
    path: "M8 5.5c3.5-1.9 8.7-2.1 12.6-.5 3.3 1.3 5.4 4 5.4 7.7 0 5.1-3.7 8.9-9 8.9-2.5 0-4.7-.7-6.6-2.2l-3.4 3.8.5-5.4C5.6 16.1 5 14.3 5 12.6c0-3 1.1-5.5 3-7.1",
    viewBox: "0 0 31 29",
  },
  loop: {
    path: "M4 16.3c1.8-5.9 7.4-10.4 13.6-10.4 4.4 0 8.3 2.6 8.3 6.8 0 5.8-7.4 8.7-12.1 8.7-3.3 0-5.8-1.3-5.8-3.7 0-2.2 2.1-3.8 4.1-3.8 1.4 0 2.5.6 3.1 1.7",
    viewBox: "0 0 30 26",
  },
  spark: {
    path: "M12 2.5l1.7 5.3 5.6 1.8-5.5 1.8-1.8 5.4-1.8-5.4L4.7 9.6l5.5-1.8L12 2.5Zm10.2 13.1.8 2.4 2.5.8-2.5.8-.8 2.5-.8-2.5-2.4-.8 2.4-.8.8-2.4Z",
    viewBox: "0 0 27 25",
  },
  underline: {
    path: "M2 9.8c4.2 2.1 8.9 3.2 14.2 3.2 4.8 0 8.6-.7 11.6-2.2M2.6 5.4c5 1.3 9.6 1.9 13.8 1.9 3.8 0 7.7-.5 11.8-1.5",
    viewBox: "0 0 30 16",
  },
};

export const InkDoodle = ({
  className,
  variant,
}: InkDoodleProps): JSX.Element => {
  const doodle = doodlePaths[variant];

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox={doodle.viewBox}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={doodle.path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};
