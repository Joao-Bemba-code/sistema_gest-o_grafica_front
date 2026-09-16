"use client";

import { useEffect, useRef, useState } from "react";

export default function NumeroInput({
  value,
  onChange,
  inteiro = false,
  className,
  placeholder,
  onFocus,
  onBlur,
  min: _min,
  max: _max,
  step: _step,
  ...props
}) {
  const [draft, setDraft] = useState(() =>
    value === null || value === undefined ? "" : String(value)
  );
  const focado = useRef(false);

  useEffect(() => {
    const v = value === null || value === undefined ? "" : String(value);
    if (!focado.current && v !== draft) setDraft(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const normalizar = (texto) => {
    let t = String(texto).replace(/[^\d.,]/g, "");
    if (inteiro) {
      t = t.replace(/[,.]/g, "");
    } else {
      const virgula = t.indexOf(",");
      const ponto = t.indexOf(".");
      let sep = -1;
      if (virgula !== -1 && ponto !== -1) sep = Math.min(virgula, ponto);
      else sep = Math.max(virgula, ponto);
      if (sep !== -1) {
        const antes = t.slice(0, sep).replace(/[,.]/g, "");
        const depois = t.slice(sep + 1).replace(/[,.]/g, "");
        t = `${antes}.${depois}`;
      }
    }
    return t;
  };

  const aoMudar = (e) => {
    const t = normalizar(e.target.value);
    setDraft(t);
    if (onChange) onChange({ target: { value: t } });
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={aoMudar}
      onFocus={(e) => {
        focado.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focado.current = false;
        onBlur?.(e);
      }}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
}