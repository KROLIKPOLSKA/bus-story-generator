import logoAsset from "@/assets/logo.png.asset.json";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  label?: string;
}

export function AppLogo({ className, label = "Logo aplikacji" }: AppLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary p-1.5 shadow-sm",
        className,
      )}
    >
      <img src={logoAsset.url} alt={label} className="h-full w-full object-contain" />
    </span>
  );
}
