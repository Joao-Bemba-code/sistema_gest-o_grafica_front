"use client";

export default function NumeroInput({
  value,
  onChange,
  inteiro = false,
  className,
  placeholder,
  min: _min,
  max: _max,
  step: _step,
  ...props
}) {
  const aoMudar = (texto) => {
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
    if (onChange) onChange({ target: { value: t } });
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => aoMudar(e.target.value)}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
}
