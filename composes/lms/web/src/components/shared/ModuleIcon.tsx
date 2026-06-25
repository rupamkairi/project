const TYPE_ICONS: Record<string, string> = {
  video: "▶",
  article: "📄",
  quiz: "✏",
  assignment: "📋",
  "live-session": "🎥",
  download: "⬇",
}

interface ModuleIconProps {
  type?: string
  className?: string
}

export function ModuleIcon({ type, className }: ModuleIconProps) {
  return <span className={className}>{TYPE_ICONS[type ?? ""] ?? "📄"}</span>
}

export { TYPE_ICONS }
