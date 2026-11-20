import { Activity, ArrowDown, ArrowRight, ArrowUp, BadgeCheck, Ban, BarChart3, Bot, CalendarDays, Camera, Check, Circle, CircleAlert, CircleCheck, CircleX, Dna, DollarSign, Eye, FileText, Gift, HeartPulse, Info, Lightbulb, Link2, Megaphone, MousePointerClick, Package, RefreshCw, Rocket, Search, Settings, ShieldCheck, ShoppingCart, Star, Target, TrendingUp, Trophy, Truck, Upload, Video, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Compatibility at the presentation boundary: diagnostic data stays unchanged.
const ICONES: Record<string, LucideIcon> = {
  "🟢": CircleCheck, "🟡": CircleAlert, "🟠": CircleAlert, "🔴": CircleX, "⚪": Circle,
  "✅": Check, "✓": Check, "✔": Check, "❌": X, "✕": X, "⚠️": CircleAlert, "⚠": CircleAlert,
  "📸": Camera, "📷": Camera, "💸": DollarSign, "💰": DollarSign, "🏆": Trophy,
  "🎯": Target, "⭐": Star, "🌟": Star, "💡": Lightbulb, "🚨": CircleAlert, "🔍": Search,
  "📈": TrendingUp, "📊": BarChart3, "🤖": Bot, "🔗": Link2, "🔄": RefreshCw,
  "📦": Package, "🚚": Truck, "🛡": ShieldCheck, "🛡️": ShieldCheck, "👆": MousePointerClick,
  "🛒": ShoppingCart, "💹": TrendingUp, "🔝": ArrowUp, "🚀": Rocket, "⚙": Settings,
  "⚙️": Settings, "🎬": Video, "🚫": Ban, "🔥": CircleAlert, "🎉": BadgeCheck,
  "🧬": Dna, "📢": Megaphone, "💚": HeartPulse, "📤": Upload, "📅": CalendarDays,
  "📝": FileText, "🎁": Gift, "ℹ️": Info, "↑": ArrowUp, "↓": ArrowDown,
  "→": ArrowRight, "▲": ArrowUp, "▼": ArrowDown, "►": ArrowRight, "○": Circle,
};

export function IconeIndicador({ simbolo, className }: { simbolo: string; className?: string }) {
  const Icone = ICONES[simbolo] ?? Activity;
  return <Icone aria-hidden="true" className={cn("inline-block h-4 w-4 shrink-0 align-text-bottom", className)} />;
}

const SIMBOLOS = new RegExp(`(${Object.keys(ICONES).sort((a, b) => b.length - a.length).join("|")})`, "u");

/** Used only for existing display labels, never exports or underlying records. */
export function TextoComIcones({ texto }: { texto: string }) {
  return <>{texto.split(SIMBOLOS).map((parte, i) => ICONES[parte]
    ? <IconeIndicador key={i} simbolo={parte} className="h-3.5 w-3.5" />
    : parte)}</>;
}