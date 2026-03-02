"use client";

import { useState, useEffect, useRef } from "react";

interface MoneyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
}

// Formatear número con puntos de miles (formato chileno)
function formatNumber(num: number | string, allowEmpty: boolean): string {
  const n = typeof num === "string" ? parseFloat(String(num).replace(/\./g, "")) : num;
  if (isNaN(n)) return "";
  if (n === 0 && allowEmpty) return "";
  if (n === 0) return "0";
  return n.toLocaleString("es-CL");
}

export default function MoneyInput({
  value,
  onChange,
  placeholder = "$ 0",
  className = "",
  disabled = false,
  allowEmpty = false,
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatNumber(value, allowEmpty));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar cuando el valor externo cambia
  useEffect(() => {
    const numValue = typeof value === "string" ? parseFloat(String(value).replace(/\./g, "")) : value;
    const currentDisplay = displayValue.replace(/\./g, "");
    const currentNum = currentDisplay === "" ? 0 : parseInt(currentDisplay, 10);

    if (numValue !== currentNum) {
      setDisplayValue(formatNumber(numValue, allowEmpty));
    }
  }, [value, allowEmpty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = e.target.value;

    // Contar puntos antes del cursor en el valor anterior
    const cursorPos = input.selectionStart || 0;
    const dotsBeforeCursorOld = (displayValue.slice(0, cursorPos).match(/\./g) || []).length;

    // Solo permitir números
    const digits = rawValue.replace(/[^\d]/g, "");

    if (digits === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const num = parseInt(digits, 10);
    const formatted = num.toLocaleString("es-CL");

    setDisplayValue(formatted);
    onChange(num);

    // Calcular nueva posición del cursor
    requestAnimationFrame(() => {
      if (inputRef.current) {
        // Posición basada en dígitos, no en caracteres formateados
        const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/[^\d]/g, "").length;

        // Encontrar la posición en el string formateado que corresponde a esa cantidad de dígitos
        let newPos = 0;
        let digitCount = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i] !== ".") {
            digitCount++;
          }
          if (digitCount === digitsBeforeCursor) {
            newPos = i + 1;
            break;
          }
        }

        // Si no encontramos la posición exacta, ir al final
        if (digitCount < digitsBeforeCursor) {
          newPos = formatted.length;
        }

        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;

    // Si presiona backspace y el caracter anterior es un punto, saltar el punto
    if (e.key === "Backspace" && cursorPos > 0 && displayValue[cursorPos - 1] === ".") {
      e.preventDefault();
      // Mover cursor antes del punto y dejar que el próximo backspace borre el dígito
      input.setSelectionRange(cursorPos - 1, cursorPos - 1);
    }

    // Si presiona delete y el caracter siguiente es un punto, saltar el punto
    if (e.key === "Delete" && cursorPos < displayValue.length && displayValue[cursorPos] === ".") {
      e.preventDefault();
      input.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
