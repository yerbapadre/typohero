import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import { frogFor } from "../theme/themes";
import { CabinetButton, CabinetPanel, Divider } from "../ui/cabinet";

const TITLES: Record<string, { main: string; sub: string }> = {
  amber: { main: "FROG SINATRA", sub: "& THE TADPOLES" },
  pond: { main: "Pondsingers" ,sub: "A musical exhibit" },
  coral: { main: "Amphibious echoes", sub: "voices from below" },
};

const OPTIONS = [
  { label: "Single Player", to: "/solo/character" },
  { label: "Multiplayer", to: "/band" },
  { label: "Join the Crowd", to: "/crowd", separated: true },
];

const DEFAULT = OPTIONS.findIndex((o) => o.label === "Multiplayer");

export function ModeSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEFAULT);
  const theme = useTheme();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => (i + 1) % OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i - 1 + OPTIONS.length) % OPTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        navigate(OPTIONS[selected]!.to);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cabinet-bg px-6 py-12 font-pixel text-cabinet-text">
      <img
        src={`/frogs/${frogFor(theme)}.png`}
        alt="frog"
        draggable={false}
        className="h-52 w-auto select-none object-contain md:h-64"
      />

      <h1 className="text-center leading-[1.3] tracking-wide">
        <span className="block text-3xl font-bold text-white md:text-5xl">
          {(TITLES[theme] ?? TITLES.amber!).main}
        </span>
        <span className="mt-2 block text-lg font-bold text-cabinet-accent md:text-2xl">
          {(TITLES[theme] ?? TITLES.amber!).sub}
        </span>
      </h1>

      <CabinetPanel className="w-full max-w-md">
        <div className="flex flex-col gap-3">
          {OPTIONS.map((o, i) => (
            <Fragment key={o.to}>
              {o.separated && <Divider className="my-1" />}
              <CabinetButton
                full
                selected={selected === i}
                onClick={() => navigate(o.to)}
                onMouseEnter={() => setSelected(i)}
              >
                {o.label}
              </CabinetButton>
            </Fragment>
          ))}
        </div>
      </CabinetPanel>
    </div>
  );
}
