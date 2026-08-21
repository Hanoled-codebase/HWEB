import React from "react";
import katex from "katex";

interface MathRendererProps {
  text: string;
  className?: string;
}

const SCIENTIFIC_UNITS: Record<string, string> = {
  "ms-1": "ms⁻¹",
  "ms-2": "ms⁻²",
  "m/s": "m·s⁻¹",
  "m/s2": "m·s⁻²",
  "km/h": "km·h⁻¹",
  "kmh-1": "km·h⁻¹",
  "rad/s": "rad·s⁻¹",
  "N/kg": "N·kg⁻¹",
  "J/kg": "J·kg⁻¹",
  "J/mol": "J·mol⁻¹",
  "kg/m3": "kg·m⁻³",
};

function formatScientificNotation(text: string): string {
  let result = text;
  for (const [plain, unicode] of Object.entries(SCIENTIFIC_UNITS)) {
    const regex = new RegExp(`(?<=^|[\\s,(])${plain.replace("/", "\\/")}(?=[\\s,).!?]|$)`, "gi");
    result = result.replace(regex, unicode);
  }
  result = result.replace(/(\w)-(\d+)/g, (_, letter, digits) => {
    const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    const sup = String(digits).split("").map((d: string) => superscripts[parseInt(d)]).join("");
    return `${letter}${sup}`;
  });
  return result;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = "" }) => {
  if (!text) return null;

  const formatted = formatScientificNotation(text);

  // Split by block math first ($$...$$) or inline math ($...$)
  // Using a robust regex that captures the mathematical blocks:
  const parts = formatted.split(/(\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2);
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="block my-2 overflow-x-auto max-w-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX block error:", e);
            return (
              <code key={index} className="block my-2 p-2 bg-red-50 text-red-700 whitespace-pre-wrap text-xs rounded border border-red-200">
                {part}
              </code>
            );
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block align-middle mx-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX inline error:", e);
            return (
              <code key={index} className="px-1 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-200">
                {part}
              </code>
            );
          }
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
};
