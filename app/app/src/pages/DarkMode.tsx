import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { toast } from "sonner";

type ThemeMode = "light" | "dark" | "system";

const themes: { id: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
  { id: "light", label: "Light", icon: Sun, description: "Bright theme for daylight use" },
  { id: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes at night" },
  { id: "system", label: "System", icon: Monitor, description: "Match your OS preference" },
];

const lightPalette = [
  { name: "Background", value: "#ffffff", text: "#000000" },
  { name: "Foreground", value: "#0a0a0a", text: "#ffffff" },
  { name: "Card", value: "#ffffff", text: "#0a0a0a" },
  { name: "Primary", value: "#171717", text: "#ffffff" },
  { name: "Secondary", value: "#f5f5f5", text: "#171717" },
  { name: "Muted", value: "#f5f5f5", text: "#737373" },
  { name: "Accent", value: "#f5f5f5", text: "#171717" },
  { name: "Destructive", value: "#ef4444", text: "#ffffff" },
  { name: "Border", value: "#e5e5e5", text: "#000000" },
  { name: "Ring", value: "#0a0a0a", text: "#ffffff" },
];

const darkPalette = [
  { name: "Background", value: "#0a0a0a", text: "#ffffff" },
  { name: "Foreground", value: "#fafafa", text: "#0a0a0a" },
  { name: "Card", value: "#0a0a0a", text: "#fafafa" },
  { name: "Primary", value: "#fafafa", text: "#0a0a0a" },
  { name: "Secondary", value: "#262626", text: "#fafafa" },
  { name: "Muted", value: "#262626", text: "#a3a3a3" },
  { name: "Accent", value: "#262626", text: "#fafafa" },
  { name: "Destructive", value: "#dc2626", text: "#ffffff" },
  { name: "Border", value: "#262626", text: "#fafafa" },
  { name: "Ring", value: "#d4d4d4", text: "#0a0a0a" },
];

export default function DarkMode() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as ThemeMode) || "system";
    }
    return "system";
  });
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (currentTheme === "system") {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(sys);
      setActiveMode(sys);
    } else {
      root.classList.add(currentTheme);
      setActiveMode(currentTheme);
    }
  }, [currentTheme]);

  const handleThemeChange = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    localStorage.setItem("theme", theme);
    toast.success(`Theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Palette className="w-6 h-6 text-indigo-600" /> Dark Mode Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize your theme preferences</p>
      </div>

      {/* Theme Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = currentTheme === theme.id;
          return (
            <Card
              key={theme.id}
              className={`cursor-pointer transition-all ${isActive ? "ring-2 ring-indigo-600 ring-offset-2" : "hover:border-gray-300"}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isActive ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <Icon className={`w-6 h-6 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{theme.label}</h3>
                      <p className="text-sm text-gray-500">{theme.description}</p>
                    </div>
                  </div>
                  {isActive && <Check className="w-5 h-5 text-indigo-600" />}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className={`h-20 rounded-md border ${theme.id === "dark" || (theme.id === "system" && activeMode === "dark") ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} flex items-center justify-center`}>
                    <div className={`w-12 h-2 rounded ${theme.id === "dark" || (theme.id === "system" && activeMode === "dark") ? "bg-gray-600" : "bg-gray-300"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Active Theme: {activeMode === "dark" ? "Dark" : "Light"} Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                {activeMode === "dark" ? <Moon className="w-6 h-6 text-indigo-600" /> : <Sun className="w-6 h-6 text-indigo-600" />}
              </div>
              <div>
                <p className="font-medium">Currently using {activeMode} mode</p>
                <p className="text-sm text-gray-500">Preference saved to localStorage</p>
              </div>
              <Badge variant="outline">{currentTheme === "system" ? "System" : currentTheme}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 border rounded-lg">
                <div className="w-full h-8 bg-primary rounded mb-2" />
                <p className="text-xs text-center text-gray-500">Primary</p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="w-full h-8 bg-secondary rounded mb-2" />
                <p className="text-xs text-center text-gray-500">Secondary</p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="w-full h-8 bg-muted rounded mb-2" />
                <p className="text-xs text-center text-gray-500">Muted</p>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="w-full h-8 bg-destructive rounded mb-2" />
                <p className="text-xs text-center text-gray-500">Destructive</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Palettes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" /> Light Theme Palette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {lightPalette.map((color) => (
                <div key={color.name} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: color.value, color: color.text, borderColor: color.name === "Border" ? "#d4d4d4" : undefined }}
                  >
                    Aa
                  </div>
                  <div>
                    <p className="text-xs font-medium">{color.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{color.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5" /> Dark Theme Palette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {darkPalette.map((color) => (
                <div key={color.name} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: color.value, color: color.text, borderColor: color.name === "Border" ? "#404040" : undefined }}
                  >
                    Aa
                  </div>
                  <div>
                    <p className="text-xs font-medium">{color.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{color.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample UI Preview */}
      <Card>
        <CardHeader><CardTitle>UI Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Success</Badge>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Error</Badge>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <p className="font-medium">Sample Card Content</p>
              <p className="text-sm text-muted-foreground">This is how card content appears in the current theme. All components adapt automatically.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
