import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
];

const LS_KEY = "app-language";

export default function LanguageSettings() {
  const [selected, setSelected] = useState(() => localStorage.getItem(LS_KEY) || "en");

  const handleSelect = (code: string) => {
    setSelected(code);
    localStorage.setItem(LS_KEY, code);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Language Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred language</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Display Language</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  selected === lang.code
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lang.name}</p>
                  <p className="text-xs text-gray-500">{lang.code.toUpperCase()}</p>
                </div>
                {selected === lang.code && <Check className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
