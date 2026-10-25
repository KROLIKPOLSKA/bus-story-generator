import logoAsset from "@/assets/logo-mark.png.asset.json";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  label?: string;
}

export function AppLogo({ className, label = "Logo aplikacji" }: AppLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={label}
      className={cn("block h-auto w-auto object-contain", className)}
    />
  );
}
