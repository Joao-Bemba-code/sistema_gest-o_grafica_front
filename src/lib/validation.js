import { digitsOnly } from "@/lib/masks";

function validCpf(digits) {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  const d1 = (sum % 11) < 2 ? 0 : 11 - (sum % 11);
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  const d2 = (sum % 11) < 2 ? 0 : 11 - (sum % 11);
  return d1 === parseInt(digits[9], 10) && d2 === parseInt(digits[10], 10);
}

export const validators = {
  required: (v) => {
    const raw = (v || "").trim();
    return raw ? "" : "Este campo é obrigatório";
  },

  email: (v) => {
    const raw = (v || "").trim();
    if (!raw) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)
      ? ""
      : "Informe um endereço de email válido";
  },

  minDigits: (n) => (v) => {
    const raw = (v || "").replace(/\D/g, "");
    if (!raw) return "";
    return raw.length >= n ? "" : `Mínimo de ${n} dígitos`;
  },

  cpf: (v) => {
    const raw = digitsOnly(v);
    if (!raw) return "";
    if (raw.length !== 11) return "CPF deve conter 11 dígitos";
    return validCpf(raw) ? "" : "CPF inválido";
  },

  nif: (v) => {
    const raw = (v || "").replace(/\D/g, "");
    if (!raw) return "";
    if (raw.length !== 9) return "NIF deve conter 9 dígitos";
    if (raw[0] === "0") return "NIF inválido";
    return "";
  },

  date: (v) => {
    const raw = (v || "").trim();
    if (!raw) return "";
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "Formato inválido (DD/MM/AAAA)";
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
      return "Data inválida";
    }
    return "";
  },
};
