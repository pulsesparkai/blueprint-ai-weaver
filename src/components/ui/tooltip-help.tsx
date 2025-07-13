import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TooltipHelpProps {
  content: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export const TooltipHelp = ({ content, className, side = "top" }: TooltipHelpProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle 
          className={cn(
            "h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors",
            className
          )} 
        />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
};