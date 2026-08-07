"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TextField } from "@/components/ui/TextField";
import { FormSection } from "@/components/ui/FormSection";
import { RadioCard } from "@/components/ui/RadioCard";
import { MediaCard } from "@/components/ui/MediaCard";
import { CardGrid } from "@/components/ui/CardGrid";
import { useTheme } from "@/contexts/ThemeContext";
import { validators } from "@/lib/validation";

/* ==========================================================================
   Blocos auxiliares da documentação
   ========================================================================== */

function Section({ icon, title, subtitle, chips, children }) {
  return (
    <section className="scroll-mt-24">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name={icon} className="text-lg" />
          </span>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        </div>
        {subtitle && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        {chips && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Icon name="check_circle" className="text-xs text-primary" />
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function TokenSwatch({ token, label }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const update = () => {
      setValue(
        getComputedStyle(document.documentElement).getPropertyValue(token).trim()
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [token]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        className="h-11 w-11 shrink-0 rounded-lg border border-border shadow-sm"
        style={{ background: value || "transparent" }}
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{token}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground/70">{value}</p>
      </div>
    </div>
  );
}

const TYPE_SCALE = [
  { name: "2xs · 12px", className: "text-xs" },
  { name: "sm · 14px", className: "text-sm" },
  { name: "base · 16px", className: "text-base" },
  { name: "lg · 20px", className: "text-xl" },
  { name: "xl · 24px", className: "text-2xl font-semibold" },
  { name: "2xl · 32px", className: "text-[2rem] font-bold tracking-tight" },
];

const SPACES = [8, 16, 24, 32, 40, 48, 64, 80];

const ELEVATIONS = [
  { name: "Repouso", cls: "shadow-card" },
  { name: "Hover", cls: "shadow-card-hover" },
  { name: "Elevada · cards", cls: "shadow-lift" },
];

function DemoField(props) {
  const [value, setValue] = useState(props.value || "");
  return (
    <TextField {...props} value={value} onChange={(e) => setValue(e.target.value)} />
  );
}

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50";

function Disclosure({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-touch w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        <Icon name={icon} className="text-lg text-muted-foreground" />
        <span className="flex-1">{title}</span>
        <Icon
          name="expand_more"
          className={cn("ds-motion text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && <div className="animate-msg-in px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ==========================================================================
   Dados de demonstração
   ========================================================================== */

const SERVICOS = [
  {
    title: "Impressão Digital",
    description:
      "Tiragens curtas a médias com cores vibrantes, provas rápidas e entrega expressa em até 24 horas úteis.",
    tags: [{ label: "Digital", variant: "info" }, { label: "Tiragem curta" }],
    badge: "Popular",
    price: "AOA 2 500",
    cta: "Orçar",
    gradient: 0,
    thumb: "https://picsum.photos/seed/impressao/800/500",
  },
  {
    title: "Offset",
    description:
      "Grandes tiragens com custo por unidade reduzido, máxima fidelidade de cor e suporte a papéis especiais.",
    tags: [{ label: "Grande tiragem", variant: "success" }],
    price: "AOA 1 800",
    cta: "Orçar",
    gradient: 1,
  },
  {
    title: "Serigrafia",
    description:
      "Personalização de brindes, tecidos e materiais rígidos em série com cores opacas e duráveis.",
    tags: [{ label: "Brindes", variant: "warning" }],
    price: "AOA 950",
    cta: "Orçar",
    gradient: 2,
  },
  {
    title: "Design Gráfico",
    description:
      "Criação de identidade visual, artes finais, diagramação editorial e preparação para impressão.",
    tags: [{ label: "Criativo", variant: "secondary" }],
    badge: "Novo",
    price: "AOA 4 200",
    cta: "Pedir proposta",
    gradient: 3,
    thumb: "https://picsum.photos/seed/design/800/500",
  },
  {
    title: "Acabamento Premium",
    description:
      "Laminação, relevo, verniz localizado, hot-stamping e encadernação para produtos de alta percepção de valor.",
    tags: [{ label: "Premium", variant: "default" }],
    price: "AOA 1 200",
    cta: "Orçar",
    gradient: 4,
  },
  {
    title: "Embalagens",
    description:
      "Caixas, sacos e rótulos personalizados, projetados para valorizar a experiência da sua marca.",
    tags: [{ label: "Embalagem", variant: "info" }],
    price: "AOA 3 100",
    cta: "Solicitar",
    gradient: 0,
  },
  {
    title: "Gravura e Corte",
    description:
      "Corte e vinco de precisão, impressão em relevo e acabamentos especiais para materiais diferenciados.",
    tags: [{ label: "Precisão", variant: "warning" }],
    price: "AOA 750",
    cta: "Orçar",
    gradient: 1,
  },
  {
    title: "Merchandising",
    description:
      "Canetas, t-shirts, cadernos e material promocional com a sua marca, do protótipo à série completa.",
    tags: [{ label: "Brindes", variant: "secondary" }],
    badge: "Sazonal",
    price: "AOA 1 500",
    cta: "Cotar",
    gradient: 2,
  },
];

const initialForm = {
  tipo: "cliente",
  nome: "",
  empresa: "",
  cpf: "",
  nif: "",
  dataNascimento: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  categoria: "",
  temCredito: false,
  limiteCredito: "",
  diasPagamento: "30",
  observacoes: "",
};

const VALIDATED_FIELDS = [
  "nome",
  "empresa",
  "cpf",
  "nif",
  "dataNascimento",
  "telefone",
  "whatsapp",
  "email",
  "limiteCredito",
];

function validateField(name, value, form) {
  const v = value || "";
  switch (name) {
    case "nome":
      return validators.required(v);
    case "empresa":
      return form.tipo === "fornecedor" ? validators.required(v) : "";
    case "cpf":
      return form.tipo === "cliente" ? validators.cpf(v) : "";
    case "nif":
      return form.tipo === "fornecedor" ? validators.nif(v) : "";
    case "dataNascimento":
      return v ? validators.date(v) : "";
    case "telefone":
      return validators.required(v) || validators.minDigits(9)(v);
    case "whatsapp":
      return v ? validators.minDigits(9)(v) : "";
    case "email":
      return validators.email(v);
    case "limiteCredito":
      return form.temCredito ? validators.required(v) : "";
    default:
      return "";
  }
}

export default function DesignSystemPage() {
  const { dark, toggleTheme } = useTheme();

  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [favs, setFavs] = useState({});
  const [shared, setShared] = useState(null);
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(""), 2600);
    return () => clearTimeout(t);
  }, [banner]);

  const fieldState = (name) => {
    if (errors[name] && touched[name]) return "error";
    if (touched[name] && String(form[name] || "").length) return "success";
    return "default";
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    const next = { ...form, [name]: val };
    setForm(next);
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, val, next) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value, form) }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setTouched({});
    setErrors({});
    setSubmitted(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(false);

    const nextTouched = { ...touched };
    const nextErrors = {};
    VALIDATED_FIELDS.forEach((name) => {
      nextTouched[name] = true;
      nextErrors[name] = validateField(name, form[name], form);
    });
    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1600);
  };

  const handleShare = async (title, index) => {
    try {
      await navigator.clipboard.writeText(`SIGRAF — ${title}`);
    } catch {
      /* clipboard indisponível: a demo segue sem feedback extra */
    }
    setShared(index);
    setTimeout(() => setShared(null), 1600);
  };

  const toggleFav = (index) =>
    setFavs((prev) => ({ ...prev, [index]: !prev[index] }));

  const isFornecedor = form.tipo === "fornecedor";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      {/* ======================= HERO ======================= */}
      <header className="mb-16">
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon name="palette" className="text-3xl" />
            </span>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-base" />
              {dark ? "Tema claro" : "Tema escuro"}
            </Button>
          </div>
          <div>
            <Badge variant="info" className="mb-3">Design System · v1.0</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Design System SIGRAF
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Conjunto de componentes de formulário e cards construídos sobre tokens
              de design, com validação inline, microinterações de 0.25s ease-in-out,
              acessibilidade WCAG 2.1 AA e hierarquia visual orientada à redução da
              carga cognitiva.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Lei de Fitts",
              "Grade 8px",
              "F-Layout",
              "Progressive disclosure",
              "0.25s ease-in-out",
              "WCAG 2.1 AA",
              "Mobile-first",
            ].map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                <Icon name="bolt" className="text-xs text-primary" />
                {p}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ======================= TOKENS ======================= */}
      <div className="space-y-20">
        <Section
          icon="palette"
          title="Design Tokens"
          subtitle="Valores semânticos únicos que alimentam todos os componentes. Altere em globals.css (variáveis :root e .dark) e todo o sistema se atualiza — os tokens abaixo são lidos diretamente do CSS em execução."
          chips={["Cores", "Tipografia", "Espaçamento", "Elevação", "Estados"]}
        >
          <div className="space-y-12">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Cores semânticas
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <TokenSwatch token="--primary" label="Primária" />
                <TokenSwatch token="--secondary" label="Secundária" />
                <TokenSwatch token="--info" label="Info" />
                <TokenSwatch token="--success" label="Sucesso" />
                <TokenSwatch token="--warning" label="Alerta" />
                <TokenSwatch token="--error" label="Erro" />
                <TokenSwatch token="--foreground" label="Texto principal" />
                <TokenSwatch token="--muted-foreground" label="Texto secundário" />
                <TokenSwatch token="--background" label="Fundo" />
                <TokenSwatch token="--card" label="Superfície" />
                <TokenSwatch token="--border" label="Borda" />
                <TokenSwatch token="--ring" label="Anel de foco" />
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Escala tipográfica · Inter
              </h3>
              <div className="space-y-1 rounded-2xl border border-border bg-card p-5">
                {TYPE_SCALE.map((t) => (
                  <div
                    key={t.name}
                    className="flex flex-col gap-1 border-b border-border/40 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <span className="w-32 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.name}
                    </span>
                    <span className={cn("text-foreground", t.className)}>
                      Impressão de alta qualidade
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Grade de espaçamento · 8px
              </h3>
              <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                {SPACES.map((size) => (
                  <div key={size} className="flex items-center gap-4">
                    <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {size}px
                    </span>
                    <span
                      className="h-3 rounded bg-primary/70"
                      style={{ width: size * 1.5 }}
                    />
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      --ds-space-{Math.round(size / 8)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Elevação
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ELEVATIONS.map((e) => (
                  <div key={e.name} className="rounded-2xl border border-border p-4">
                    <div
                      className={cn(
                        "mb-3 flex h-28 items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground",
                        e.cls
                      )}
                    >
                      {e.name}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      class: {e.cls}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Estados universais
              </h3>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
                <Button>Padrão</Button>
                <Button loading>A processar</Button>
                <Button disabled>Desativado</Button>
                <Button variant="success">
                  <Icon name="check_circle" className="text-base" /> Sucesso
                </Button>
                <Button variant="destructive">
                  <Icon name="error" className="text-base" /> Erro
                </Button>
                <Button className="focus-ring-soft">Foco · Tab</Button>
                <Button variant="outline" size="icon" aria-label="Ação secundária">
                  <Icon name="more_vert" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Hover e Active ocorrem naturalmente na interação. Todos os botões
                mantêm alvo de toque ≥ 44px (Lei de Fitts) e contraste AA.
              </p>
            </div>
          </div>
        </Section>

        {/* ======================= FORMULÁRIOS ======================= */}
        <Section
          icon="assignment"
          title="Formulários"
          subtitle="Campos com floating labels, validação inline em tempo real (check/x + cores semânticas), máscaras de entrada, helper texts exibidos apenas quando necessários e botão de submit com estado de loading."
          chips={["Floating labels", "Validação inline", "Máscaras", "Microinterações 0.25s", "A11y"]}
        >
          <div className="space-y-12">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Estados de campo
              </h3>
              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
                <DemoField label="Padrão" placeholder="Campo em repouso" />
                <DemoField label="Preenchido" value="João Manuel dos Santos" icon="person" />
                <DemoField
                  label="Sucesso"
                  value="joao@exemplo.com"
                  state="success"
                  message="Email disponível e válido"
                />
                <DemoField
                  label="Erro"
                  value="joao@exemplo"
                  state="error"
                  message="Informe um endereço de email válido"
                  helper="Usado para envio de faturas."
                />
                <DemoField
                  label="Alerta"
                  value="30/06"
                  state="warning"
                  message="Validade próxima do vencimento"
                />
                <DemoField label="Desativado" value="somente-leitura" disabled />
                <DemoField
                  label="Máscara · CPF"
                  mask="cpf"
                  placeholder="000.000.000-00"
                  helper="Formatação automática de dígitos."
                />
                <DemoField
                  label="Máscara · Telefone"
                  mask="phoneAO"
                  placeholder="+244 999 999 999"
                  icon="call"
                />
              </div>
            </div>

            {/* ----- Formulário completo ----- */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Formulário completo · validação + progressive disclosure
              </h3>

              {submitted && (
                <div
                  role="status"
                  className="animate-msg-in mb-6 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Icon name="check" className="text-lg" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Formulário validado com sucesso
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Todos os campos passaram na validação inline. Simulação de
                      envio concluída em 1.6s.
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-6 rounded-2xl border border-border bg-background/60 p-4 sm:p-6"
              >
                <FormSection
                  step="1"
                  title="Identificação"
                  description="Selecione o tipo de registo. Campos condicionais (progressive disclosure) aparecem conforme a escolha."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de registo">
                    <RadioCard
                      selected={form.tipo === "cliente"}
                      onChange={() => setForm((f) => ({ ...f, tipo: "cliente" }))}
                      icon="person"
                      title="Cliente"
                      description="Pessoa singular ou consumidor final"
                    />
                    <RadioCard
                      selected={form.tipo === "fornecedor"}
                      onChange={() => setForm((f) => ({ ...f, tipo: "fornecedor" }))}
                      icon="local_shipping"
                      title="Fornecedor"
                      description="Empresa que fornece insumos e serviços"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {!isFornecedor ? (
                      <>
                        <TextField
                          name="nome"
                          label="Nome completo"
                          icon="person"
                          required
                          placeholder="Ex: João Manuel dos Santos"
                          helper="Conforme o documento de identificação."
                          value={form.nome}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          state={fieldState("nome")}
                          message={errors.nome}
                        />
                        <TextField
                          name="cpf"
                          label="CPF"
                          icon="badge"
                          mask="cpf"
                          placeholder="000.000.000-00"
                          helper="Máscara automática com validação de dígitos verificadores."
                          value={form.cpf}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          state={fieldState("cpf")}
                          message={errors.cpf}
                        />
                        <TextField
                          name="dataNascimento"
                          label="Data de nascimento"
                          icon="cake"
                          mask="date"
                          placeholder="DD/MM/AAAA"
                          value={form.dataNascimento}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          state={fieldState("dataNascimento")}
                          message={errors.dataNascimento}
                        />
                      </>
                    ) : (
                      <>
                        <TextField
                          name="empresa"
                          label="Empresa / Razão social"
                          icon="storefront"
                          required
                          placeholder="Ex: Papelaria Angola Lda."
                          helper="A designação oficial do fornecedor."
                          value={form.empresa}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          state={fieldState("empresa")}
                          message={errors.empresa}
                        />
                        <TextField
                          name="nif"
                          label="NIF"
                          icon="pin"
                          required
                          placeholder="Ex: 541236987"
                          helper="9 dígitos, sem espaços."
                          value={form.nif}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          state={fieldState("nif")}
                          message={errors.nif}
                        />
                      </>
                    )}
                  </div>
                </FormSection>

                <FormSection
                  step="2"
                  title="Contactos"
                  description="Telefones com máscara local (+244) e email com validação de formato."
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <TextField
                      name="telefone"
                      label="Telefone"
                      icon="call"
                      required
                      mask="phoneAO"
                      placeholder="+244 999 999 999"
                      value={form.telefone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      state={fieldState("telefone")}
                      message={errors.telefone}
                    />
                    <TextField
                      name="whatsapp"
                      label="WhatsApp"
                      icon="chat"
                      mask="phoneAO"
                      placeholder="+244 999 999 999"
                      value={form.whatsapp}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      state={fieldState("whatsapp")}
                      message={errors.whatsapp}
                    />
                    <TextField
                      name="email"
                      label="Email"
                      icon="mail"
                      placeholder="contato@exemplo.com"
                      helper="Apenas visível enquanto o campo está em foco."
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      state={fieldState("email")}
                      message={errors.email}
                    />
                    <TextField
                      name="endereco"
                      label="Endereço"
                      icon="location_on"
                      placeholder="Ex: Rua Major Kanhangulo, 145 — Luanda"
                      value={form.endereco}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      state={fieldState("endereco")}
                    />
                  </div>
                </FormSection>

                <FormSection
                  step="3"
                  title="Condições comerciais"
                  description="Área condicional: os campos de crédito surgem apenas quando a opção é ativada."
                >
                  {isFornecedor && (
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="categoria"
                        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Categoria de fornecimento
                      </label>
                      <select
                        id="categoria"
                        name="categoria"
                        className={selectClass}
                        value={form.categoria}
                        onChange={handleChange}
                      >
                        <option value="">Selecionar categoria…</option>
                        <option>Papel e cartão</option>
                        <option>Químicos e tintas</option>
                        <option>Acabamentos</option>
                        <option>Logística</option>
                        <option>Outros</option>
                      </select>
                    </div>
                  )}

                  <label className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <input
                      type="checkbox"
                      name="temCredito"
                      checked={form.temCredito}
                      onChange={handleChange}
                      className="h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="text-sm font-semibold text-foreground">
                      Oferecer condições de crédito
                    </span>
                    <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
                      Revela campos adicionais
                    </span>
                  </label>

                  {form.temCredito && (
                    <div className="animate-msg-in grid grid-cols-1 gap-5 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2">
                      <TextField
                        name="limiteCredito"
                        label="Limite de crédito (AOA)"
                        icon="account_balance_wallet"
                        placeholder="Ex: 500 000"
                        required
                        value={form.limiteCredito}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        state={fieldState("limiteCredito")}
                        message={errors.limiteCredito}
                      />
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="diasPagamento"
                          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Dias de pagamento
                        </label>
                        <select
                          id="diasPagamento"
                          name="diasPagamento"
                          className={selectClass}
                          value={form.diasPagamento}
                          onChange={handleChange}
                        >
                          <option value="15">15 dias</option>
                          <option value="30">30 dias</option>
                          <option value="45">45 dias</option>
                          <option value="60">60 dias</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <Disclosure title="Informações adicionais" icon="notes">
                    <TextField
                      name="observacoes"
                      label="Observações"
                      multiline
                      rows={3}
                      placeholder="Notas internas, condições especiais, prioridades…"
                      value={form.observacoes}
                      onChange={handleChange}
                    />
                  </Disclosure>
                </FormSection>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
                  <p className="mr-auto hidden text-[11px] text-muted-foreground lg:block">
                    Tente submeter vazio: a validação aponta o primeiro campo com erro.
                  </p>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Limpar
                  </Button>
                  <Button type="submit" loading={loading} className="min-w-[140px]">
                    {loading ? "A guardar…" : "Guardar registo"}
                    {!loading && <Icon name="save" className="text-base" />}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Section>

        {/* ======================= CARDS ======================= */}
        <Section
          icon="grid_view"
          title="Cards"
          subtitle="Cards modulares com thumbnail, título, descrição truncada, tags categorizadoras, CTA primário e ações secundárias (favoritar/compartilhar). Entrada staggered ao carregar, elevação + scale 1.02 no hover e grade responsiva Mobile-First."
          chips={["Stagger 80ms", "Hover: shadow-lift + scale(1.02)", "Radius 16px", "1 · 2 · 3 · 4 colunas", "Line-clamp"]}
        >
          <div className="space-y-8">
            {banner && (
              <div
                role="status"
                className="animate-msg-in flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Icon name="add_shopping_cart" className="text-base" />
                </span>
                <p className="text-foreground">
                  Orçamento solicitado para <b>{banner}</b>
                </p>
              </div>
            )}

            <CardGrid columns={4} stagger={80}>
              {SERVICOS.map((s, index) => (
                <MediaCard
                  key={s.title}
                  thumbnail={s.thumb}
                  alt={s.title}
                  title={s.title}
                  description={s.description}
                  tags={s.tags}
                  badge={s.badge}
                  price={s.price}
                  ctaLabel={s.cta}
                  onCta={() => setBanner(s.title)}
                  favorite={Boolean(favs[index])}
                  onToggleFavorite={() => toggleFav(index)}
                  onShare={() => handleShare(s.title, index)}
                  shared={shared === index}
                  gradientIndex={s.gradient}
                />
              ))}
            </CardGrid>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: "format_letter_spacing",
                  title: "Padrão em F",
                  text: "Imagem → título → descrição truncada (line-clamp) → tags → ações, no fluxo natural de leitura.",
                },
                {
                  icon: "aspect_ratio",
                  title: "Responsividade",
                  text: "1 coluna no mobile, 2 no tablet, 3 no desktop e 4 em ecrãs largos (CardGrid).",
                },
                {
                  icon: "favorite",
                  title: "Estados ricos",
                  text: "Favoritar com aria-pressed, compartilhar com feedback de clipboard e CTA com feedback de ação.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={c.icon} className="text-lg" />
                  </span>
                  <p className="text-sm font-bold text-foreground">{c.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ======================= ACESSIBILIDADE ======================= */}
        <Section
          icon="accessibility_new"
          title="Acessibilidade"
          subtitle="Práticas aplicadas em todos os componentes, verificáveis com leitores de ecrã e navegação exclusiva por teclado."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: "contrast",
                title: "Contraste WCAG 2.1 AA",
                text: "Textos e estados semânticos respeitam a proporção mínima de 4.5:1 (texto normal).",
              },
              {
                icon: "keyboard",
                title: "Navegação por teclado",
                text: "Tab order natural e anel de foco visível (focus-visible) em todos os interativos.",
              },
              {
                icon: "label",
                title: "Labels associadas",
                text: "label + htmlFor, aria-labelledby e aria-describedby ligam rótulos, helpers e erros aos campos.",
              },
              {
                icon: "record_voice_over",
                title: "Anúncios de validação",
                text: "Erros com role=\"alert\" e aria-invalid; estados de loading com aria-busy no botão.",
              },
              {
                icon: "touch_app",
                title: "Alvos de toque ≥ 44px",
                text: "Inputs com 48px de altura e botões de ação com 44px (Lei de Fitts).",
              },
              {
                icon: "motion_photos_on",
                title: "prefers-reduced-motion",
                text: "Todas as animações são desativadas quando o sistema pede redução de movimento.",
              },
            ].map((a) => (
              <div
                key={a.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Icon name={a.icon} className="text-lg" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {a.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <footer className="mt-20 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground">
          SIGRAF Design System — Formulários e Cards · Rotas:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            /design-system
          </code>
        </p>
      </footer>
    </div>
  );
}
