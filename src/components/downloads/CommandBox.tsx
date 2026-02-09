import { useState, useRef } from "react";
import { Keyboard, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommandBoxProps {
    commands: string;
}

export const CommandBox = ({ commands }: CommandBoxProps) => {
    const [copied, setCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(commands);
            setCopied(true);
            toast.success("Comandos copiados para a área de transferência!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Erro ao copiar comandos.");
        }
    };

    const handleDoubleClick = () => {
        handleCopy();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 border-l-4 border-destructive pl-4 py-1">
                <Keyboard className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-primary uppercase tracking-tight">Commands</h2>
            </div>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            ref={containerRef}
                            onDoubleClick={handleDoubleClick}
                            className="relative group bg-[#0d1117] border border-border/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:border-primary/30"
                        >
                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy();
                                    }}
                                    className="p-2 bg-background/20 backdrop-blur-md rounded-lg border border-white/10 hover:bg-background/40 transition-colors"
                                    title="Copiar tudo"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4 text-white" />
                                    )}
                                </button>
                            </div>

                            <pre className="p-6 text-sm font-mono text-gray-300 overflow-x-auto selection:bg-primary/30 selection:text-white">
                                <code className="whitespace-pre-wrap break-words">
                                    {commands}
                                </code>
                            </pre>

                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-primary text-primary-foreground font-medium">
                        <p>Ctrl+C ou duplo clique para copiar</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};
