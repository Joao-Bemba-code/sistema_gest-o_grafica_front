const MASKS = {
  cpf: "###.###.###-##",
  cnpj: "##.###.###/####-##",
  phoneBR: "(##) #####-####",
  phoneAO: "+244 ### ### ###",
  date: "##/##/####",
  cep: "#####-###",
  creditCard: "#### #### #### ####",
  cardExpiry: "##/##",
};

export function digitsOnly(value) {
  return (value || "").replace(/\D/g, "");
}

export function applyMask(value, pattern) {
  const digits = digitsOnly(value);
  let out = "";
  let i = 0;
  for (const ch of pattern) {
    if (i >= digits.length) break;
    out += ch === "#" ? digits[i++] : ch;
  }
  return out;
}

export function maskPattern(mask) {
  return MASKS[mask] || mask || null;
}

export function maskValue(value, mask) {
  const pattern = maskPattern(mask);
  return pattern ? applyMask(value, pattern) : value;
}

export function maskMaxLength(mask) {
  const pattern = maskPattern(mask);
  return pattern ? pattern.length : undefined;
}
