import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bold, Italic, Underline, Palette, Type, ALargeSmall, Link2 } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const FONT_SIZES = [
  { value: "12px", label: "Pequeno" },
  { value: "16px", label: "Normal" },
  { value: "20px", label: "Grande" },
  { value: "24px", label: "Muito Grande" },
  { value: "32px", label: "Enorme" },
];

const FONT_FAMILIES = [
  { value: "inherit", label: "Padrão" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Courier New, monospace", label: "Courier" },
  { value: "Times New Roman, serif", label: "Times" },
  { value: "Verdana, sans-serif", label: "Verdana" },
];

const PRESET_COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#008000", "#000080", "#FFC0CB", "#FFD700", "#808080",
];

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [customColor, setCustomColor] = useState("#000000");

  // Sync internal content with external value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const applyColor = (color: string) => {
    execCommand("foreColor", color);
  };

  const applyFontSize = (size: string) => {
    // Use CSS instead of deprecated fontSize command
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement("span");
        span.style.fontSize = size;
        try {
          range.surroundContents(span);
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        } catch (e) {
          // If surroundContents fails, use execCommand as fallback
          execCommand("fontSize", "7");
        }
      }
    }
  };

  const applyFontFamily = (font: string) => {
    execCommand("fontName", font);
  };

  const applyLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert("Selecione uma palavra ou trecho de texto primeiro.");
      return;
    }
    const url = prompt("Digite a URL do link:");
    if (url) {
      execCommand("createLink", url);
      // Style the link
      if (editorRef.current) {
        const links = editorRef.current.querySelectorAll("a");
        links.forEach((link) => {
          link.style.color = "#3b82f6";
          link.style.textDecoration = "underline";
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        });
        onChange(editorRef.current.innerHTML);
      }
    }
  };

  return (
    <div className="border border-input rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-input bg-muted/50">
        {/* Bold */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("bold")}
          className="h-8 w-8 p-0"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Italic */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("italic")}
          className="h-8 w-8 p-0"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Underline */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("underline")}
          className="h-8 w-8 p-0"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyLink}
          className="h-8 w-8 p-0"
          title="Inserir link"
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Color Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Cor do texto"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">Cores</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded border border-input hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color)}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-8 w-12 p-0 border-0"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyColor(customColor)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Size */}
        <Select onValueChange={applyFontSize}>
          <SelectTrigger className="h-8 w-[110px]">
            <ALargeSmall className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Tamanho" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Family */}
        <Select onValueChange={applyFontFamily}>
          <SelectTrigger className="h-8 w-[110px]">
            <Type className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[150px] p-3 focus:outline-none prose prose-sm max-w-none"
        onInput={handleInput}
        data-placeholder={placeholder}
        dir="ltr"
        style={{
          minHeight: "150px",
          unicodeBidi: "plaintext",
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}