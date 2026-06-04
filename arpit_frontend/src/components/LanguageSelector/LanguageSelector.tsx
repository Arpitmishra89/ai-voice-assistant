import { useLanguage } from "../../context/LanguageContext";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) =>
        setLanguage(e.target.value as "en" | "hi")
      }
      className="
        rounded-lg
        border
        border-zinc-700
        bg-zinc-900
        px-3
        py-1
        text-sm
        text-white
        outline-none
      "
    >
      <option value="en">
        🇬🇧 English
      </option>

      <option value="hi">
        🇮🇳 हिन्दी
      </option>
    </select>
  );
}