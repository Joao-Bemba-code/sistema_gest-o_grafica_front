# Proposta de Design System — KAMGEST (SIGRAF)

> Documento de trabalho: proposta de tokens, regras e correções visuais.
> Nenhuma alteração foi aplicada ao código ainda. Fases de migração no fim.

## Contexto do projeto

- **Stack**: Next.js (App Router) + React + Tailwind CSS v4 (`@import "tailwindcss"` com `@theme inline`)
- **Estilos atuais**: Tailwind + `src/app/globals.css` (tokens shadcn-style + camadas legacy)
- **Tema**: escuro por defeito (classe `.dark` no `<html>`, guardado em `localStorage` `sigraf-theme`); claro disponível
- **Fontes**: Inter (sans) + JetBrains Mono (mono), via `next/font`; ícones Material Symbols (`/fonts/material-symbols-outlined.css`)
- **Público**: operador da gráfica, uso diário intensivo em desktop e telemóvel
- **Preferências globais do dono**: sóbrio (sem gradientes, blur/glass, sombras coloridas), sem maiúsculas nos rótulos, uma cor de destaque, densidade média, alvos de toque confortáveis

---

## 1. Diagnóstico rápido

- `globals.css` tem **4 "eras" de estilo empilhadas** (base → KAMGEST `ds-*` → "Obsidian/Cyber" → "Premium") com ~200 linhas de regras neutralizadas ou mortas: `.scanlines { display: none }`, `.wave-overlay { display: none }`, `.gradient-* { background-image: none }`, `.glow-* { box-shadow: none }`, `.animate-* { animation: none }`, 4 classes de "glass" **idênticas** (`.glass`, `.obsidian-glass`, `.glass-panel`, `.glass-input`).
- **Escala de raios colapsada**: `--radius-sm/md/lg/xl/2xl/3xl` terminam em `0.875rem` — modal (`rounded-2xl`) e card (`rounded-xl`) têm o mesmo raio de 14px.
- **Três estilos de foco diferentes** para inputs: `ring-primary/25` (Input.js), `box-shadow 2px mix 20%` (`.form-input`), `box-shadow 3px mix 16%` (`.glass-input`).
- **Duas receitas de badge/tag**: `ui/Badge` (pill, `bg/10 border/30`) vs `ui/Ledger.StatusBadge` (rect, `bg/15 border/25`) — mesma função, dois visuais.
- **`variant="gradient"` no Button é alias morto** do `default` (0 usos no código — herança da era "efeitos").
- **Cores hex hardcoded**: 160 ocorrências em 13 ficheiros (52 só na página de relatórios, 8 no Avatar, 13 no dashboard) — fora dos tokens.
- **Contraste AA falha em claro**: `--success: #10b981` como texto sobre fundo claro ≈ 3.1:1 (precisa de 4.5:1); `--warning: #f58220` ≈ 2.9:1; `--error: #ee2a24` ≈ 4.0:1.
- **Acessibilidade**: Modal sem *focus trap*; Toast usa `role="alert"` para sucesso; skeletons sem `aria-busy`; 101 `title=` nativos espalhados (tooltip inconsistente).
- **Duplicação**: botão primário "novo" do LedgerHeader recria o Button inline; `Button` usa `hover:bg-primary/90` (opacidade) em vez de token de hover.

---

## 2. Design tokens (fonte de verdade)

Ficheiro único: `src/app/globals.css`. Mantém os nomes atuais (migração mínima); acrescenta o que falta e corrige valores.

### 2.1 Paleta semântica — claro

```css
:root {
  color-scheme: light;

  /* superfícies */
  --background: #f0f4f8;
  --foreground: #1e293b;
  --card: #ffffff;
  --card-foreground: #1e293b;
  --popover: #ffffff;
  --popover-foreground: #1e293b;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;   /* 4.7:1 sobre branco — AA para texto pequeno */
  --accent: #eff4fb;
  --accent-foreground: #1e293b;
  --border: #e2e8f0;
  --input: #cbd5e1;

  /* marca */
  --primary: #0066ff;
  --primary-foreground: #ffffff;
  --primary-hover: #0052cc;      /* novo: hover explícito (não /90) */
  --primary-active: #004099;     /* novo: pressed */
  --secondary: #64748b;
  --secondary-foreground: #ffffff;
  --ring: #0066ff;

  /* estados — valores escurecidos para texto AA sobre superfície clara */
  --success: #059669;            /* 3.0:1 como preenchimento; ver --success-ink */
  --success-foreground: #ffffff;
  --success-ink: #047857;        /* novo: texto sobre tint (AA) */
  --warning: #d97706;
  --warning-foreground: #ffffff;
  --warning-ink: #b45309;
  --error: #dc2626;              /* 4.5:1 texto; preenchimentos usam /15 */
  --error-foreground: #ffffff;
  --error-ink: #b91c1c;
  --info: #0066ff;
  --info-foreground: #ffffff;
  --info-ink: #1d4ed8;

  /* destructive = alias de error (compatibilidade shadcn) */
  --destructive: var(--error);
  --destructive-foreground: var(--error-foreground);

  /* dados (gráficos) — não mudam com o tema para identidade de categoria */
  --data-1: #0066ff;
  --data-2: #dc2626;
  --data-3: #d97706;
  --data-4: #ca8a04;
  --data-5: #059669;
  --data-6: #64748b;
}
```

### 2.2 Paleta semântica — escuro

```css
.dark {
  color-scheme: dark;

  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --muted: oklch(1 0 0 / 0.06);
  --muted-foreground: oklch(0.708 0 0);   /* ≈7:1 sobre o fundo — AA */
  --accent: oklch(1 0 0 / 0.08);
  --accent-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);

  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --primary-hover: oklch(0.85 0 0);
  --primary-active: oklch(0.78 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.922 0 0);

  --success: #34d399;
  --success-foreground: #052e16;
  --success-ink: #6ee7b7;
  --warning: #fbbf24;
  --warning-foreground: #451a03;
  --warning-ink: #fcd34d;
  --error: #f87171;
  --error-foreground: #450a0a;
  --error-ink: #fca5a5;
  --info: #7aa2f7;
  --info-foreground: #0b1220;
  --info-ink: #93c5fd;

  --destructive: var(--error);
  --destructive-foreground: var(--error-foreground);

  --data-1: #60a5fa;
  --data-2: #f87171;
  --data-3: #fbbf24;
  --data-4: #fde047;
  --data-5: #34d399;
  --data-6: #94a3b8;
}
```

### 2.3 Raios (corrigir escala colapsada)

```css
@theme inline {
  --radius-xs: 0.25rem;    /* 4px  — reservado */
  --radius-sm: 0.375rem;   /* 6px  — chips pequenos, StatusBadge */
  --radius-md: 0.5rem;     /* 8px  — icon chips, seg-tab */
  --radius-lg: 0.625rem;   /* 10px — botões, inputs, selects */
  --radius-xl: 0.875rem;   /* 14px — cards, KPI */
  --radius-2xl: 1rem;      /* 16px — modais (antes: 14px, igual ao card) */
  --radius-3xl: 1.25rem;   /* 20px — painéis grandes */
}
```

Regra de uso: **botão/input = 10px · card = 14px · modal = 16px · pill = 999px**.

> Aplicado na fase 1 (2026-11-09): raios `sm/md/lg/xl` mantiveram os valores antigos
> (mudança mínima — só `2xl` e `3xl` mudaram), e os usos de `rounded-2xl` em cards
> foram normalizados para `rounded-xl` para manter 14px (ver §5).

### 2.4 Escala tipográfica (6 níveis)

| Token/classe | Tamanho | Line-height | Peso | Letter-spacing | Uso |
|---|---|---|---|---|---|
| `.text-display` | 36px | 40px | 700 | -0.02em | Números grandes (login, dashboards) |
| `.text-headline-md` | 24px | 32px | 700 | -0.02em | Título de página |
| `.text-headline-sm` | 20px | 28px | 700 | -0.015em | Título de secção |
| `.text-body` | 14px | 22px | 400 | 0 | Texto base do sistema |
| `.text-label` | 12px | 16px | 600 | 0 | Rótulos, cabeçalhos de tabela |
| `.text-caption` | 11px | 16px | 500 | 0 | Meta, contagens (sem uppercase) |
| `.text-mono` | 13px | 20px | 400 | 0 | NIF, códigos, valores (`tabular-nums`) |

Correções sobre o atual: `.text-display` baixa de 800 → 700 (mais sóbrio) e `.text-caption` **perde o `text-transform: uppercase`** (preferência global da casa).

### 2.5 Espaçamento (base 4px)

Usar a escala padrão do Tailwind como fonte de verdade — **remover** o bloco `--ds-space-*` (duplicado, sem uso):

| Token Tailwind | Valor | Uso típico |
|---|---|---|
| `gap-1` / `p-1` | 4px | dentro de chips |
| `gap-2` / `p-2` | 8px | entre botão e ícone |
| `gap-3` / `p-3` | 12px | entre elementos de um card |
| `p-4` | 16px | padding padrão de card |
| `gap-4` | 16px | entre cards em grelha |
| `p-6` | 24px | secções, painéis |
| `py-14` | 56px | empty states |

Ritmo vertical: secção = 24px entre blocos; dentro do card = 12–16px; densidade de tabela = linha 44–48px.

### 2.6 Sombras (elevação 0–3) — manter os valores atuais, documentar

| Elevação | Token | Uso |
|---|---|---|
| 0 | `shadow-none` | conteúdo dentro de superfícies |
| 1 | `shadow-sm` / `--shadow-card` | cards, KPI |
| 2 | `shadow-md` / `--shadow-dropdown` | dropdowns, popovers, toasts |
| 3 | `shadow-lg` / `--shadow-modal` | modais |

Hierarquia faz-se por **borda** primeiro, sombra só como reforço. Sem sombras coloridas.

### 2.7 Durações de transição

```css
:root {
  --duration-fast: 120ms;   /* hover de cor (botões, linhas) */
  --duration-base: 200ms;   /* borda, fundo, sombra */
  --duration-slow: 300ms;   /* arrasto do modal, painéis */
}
```

Aplicar com `duration-[var(--duration-fast)]` ou adicionar ao `@theme` para gerar `duration-fast/base/slow`. Nunca `transition-all` — transicionar só `color`, `background-color`, `border-color`, `box-shadow`.

---

## 3. Regras do sistema (curtas)

1. **Hierarquia**: o valor (número/Kz) é o elemento mais forte do ecrã; rótulos são silenciosos (`text-muted-foreground` 12px); títulos só competem entre si, nunca com os dados.
2. **Uma cor de destaque por ecrã**: o primário. Verde/laranja/vermelho só para **estado** (pago, pendente, erro). Nunca decorar com cor.
3. **Densidade**: card = 16px de padding; grelha de cards = 16px de gap; tabela = 44–48px de linha; nada de espaços "a respirar" só por respirar.
4. **Estados de componente** (ordem de força visual):
   - **default** — forma normal;
   - **hover** — só fundo/borda (120ms);
   - **focus-visible** — anel de 2px `ring/40` (botões) ou `primary/25` + borda (inputs) — sempre visível, nunca só cor;
   - **active** — token `primary-active` (escurecer);
   - **disabled** — `opacity-50` + `cursor-not-allowed`, sem hover;
   - **loading** — spinner inline no próprio botão (substitui o label), `aria-busy`;
   - **error** — mensagem `text-error-ink` 12px por baixo do campo + borda `border-error` no campo.
5. **Contraste AA sempre**: texto de status usa `*-ink` sobre tint; nunca a cor "viva" como texto sobre fundo claro.
6. **Rótulos em caixa normal** (sem uppercase) — já é regra global em `label, th`; aplicar também a `.text-caption`.
7. **Alvos de toque ≥ 44px** nos elementos de ação primária em mobile; 36px aceitável para ações secundárias densas em desktop.
8. **Sem efeitos**: nada de gradientes, blur, brilhos, emojis como ícones. `prefers-reduced-motion` já está coberto globalmente — manter.

---

## 4. Componentes

### 4.1 Botões

**Problema**: variante `gradient` morta; hover por opacidade (`/90`); `transition-[...transform]` sem transform; `success` com `text-white` hardcoded; foco diferente do resto do sistema.

**Solução**: remover `gradient` (0 usos), usar `--primary-hover/active`, transição só de cor/fundo/borda, `success` com `success-foreground`, foco canónico.

**Antes** (`src/components/ui/Button.js`):
```js
default: "bg-primary text-primary-foreground hover:bg-primary/90",
gradient: "bg-primary text-primary-foreground hover:bg-primary/90",   // remover
success: "bg-success text-white hover:bg-success/90",                  // text-white hardcoded
// base: transition-[color,background-color,border-color,transform]    // transform sem uso
```

**Depois**:
```js
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium shadow-none transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        destructive:
          "bg-error/15 text-error-ink border border-error/30 hover:bg-error hover:text-error-foreground",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        success:
          "bg-success text-success-foreground hover:bg-success/85",
        link: "text-primary underline-offset-4 hover:underline p-0",
      },
      // size inalterado (default h-10, sm h-9, lg h-11, icon h-10 w-10)
    },
  }
);
```

### 4.2 Cards (default, interativo, métrica)

**Problema**: 5 classes CSS idênticas (`.card`, `.fluid-card`, `.glass`, `.obsidian-glass`, `.glass-panel`); KPI interativo usa `ring-primary/50` ativo fora do padrão.

**Solução**: um único padrão de card (borda + `bg-card` + `shadow-sm` + `rounded-xl`). As classes legacy ficam como alias temporário; remover após grep a 0 usos.

```css
/* fonte de verdade — manter só esta definição */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
}
.card:hover { border-color: color-mix(in srgb, var(--border) 60%, var(--foreground)); }

/* alias temporário (migração) */
.glass, .obsidian-glass, .glass-panel, .fluid-card {
  /* mesmo bloco da .card — depois remover */
}
```

**KpiCard** (interativo): trocar `active && "ring-2 ring-primary/50"` por `active && "border-primary ring-2 ring-primary/25"` — o estado selecionado passa a ser borda + anel subtil, não um anel grosso colorido.

### 4.3 Inputs, selects, textareas

**Problema**: 3 estilos de foco; `transition-all` no Input.js (cara e imprecisa); `.form-input` usa `background: var(--background)` (fundo cinza sobre card branco — inconsistente com Input.js que usa `bg-background`… ambos cinza, ok) mas raio 10px vs h-10 (40px) — manter altura.

**Solução**: um foco canónico para todos os controlos inline:

```css
/* globals.css — substituir os 3 blocos de foco atuais */
.form-input, .form-select, .form-textarea,
.glass-input {
  transition: border-color var(--duration-base) ease, box-shadow var(--duration-base) ease;
}
.form-input:focus-visible, .form-select:focus-visible, .form-textarea:focus-visible,
.glass-input:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent);
}
```

**Input.js/Select.js** — alinhar à mesma receita:
```js
// antes
"… focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary transition-all duration-200 …"
// depois
"… focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 transition-[border-color,box-shadow] duration-[var(--duration-base)] …"
```

Erro no campo: `aria-invalid="true"` + `border-error` + mensagem `text-error-ink` por baixo (padrão já usado em formulários — tornar explícito).

**Checkbox/radio**: manter `accent-color: var(--primary)` global; tamanho nativo 16px; a área clicável é o `<label>` inteiro (≥44px de altura em mobile). Sem componente novo.

**Switch** (não existe — spec novo, sem dependência):
```jsx
function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
        checked ? "bg-primary border-primary" : "bg-muted border-input",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-fast)]",
          checked ? "translate-x-5.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
```
(com `disabled` e contraste: pista branca sobre `--primary` claro tem 4.5:1 ✓; no escuro a pista branca sobre `--primary` quase-branco usa `--primary-foreground`… usar `bg-primary-foreground` na pista quando ativo.)

### 4.4 Modais e dialogs

**Problema**: sem *focus trap* (Tab sai do modal); `rounded-2xl` = 14px (igual ao card); sem restaurar foco; arrasto com transição inline (ok).

**Solução**: trap simples no handler de teclado já existente + raio corrigido pelo token.

```js
// Modal.js — antes
const onKey = (e) => { if (e.key === "Escape") onClose?.(); };

// Modal.js — depois
const panelRef = useRef(null);
const onKey = (e) => {
  if (e.key === "Escape") { onClose?.(); return; }
  if (e.key !== "Tab" || !panelRef.current) return;
  const focaveis = panelRef.current.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focaveis.length) return;
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
};
```
+ `ref={panelRef}` no painel e `rounded-2xl` passa a renderizar 16px (só com o fix do token, sem tocar no componente).

Já conforme: `role="dialog"`, `aria-modal`, `aria-labelledby`, ESC, scroll lock, foco inicial no fechar. Manter overlay `bg-black/40` (ver perguntas em aberto).

### 4.5 Toasts

**Problema**: `role="alert"` em tudo (sucesso não é alerta); `aria-live` no contentor + `role` por toast é redundante; sem pausa no hover; empilhamento ilimitado.

**Solução**: papel por tipo, pausa no hover, máximo 4, `max-w-sm`.

```js
// Toast.js — diffs
const variants = {
  success: { chip: "bg-success/15 text-success-ink", icon: "check_circle", role: "status" },
  error:   { chip: "bg-error/15 text-error-ink",   icon: "warning",       role: "alert" },
  warning: { chip: "bg-warning/15 text-warning-ink", icon: "warning",     role: "alert" },
  info:    { chip: "bg-info/15 text-info-ink",     icon: "info",          role: "status" },
};

// contentor: remover aria-live (cada toast tem o seu papel)
<div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none items-end">

// addToast: máximo 4 + registo do timer para pausa
const timers = useRef(new Map());
const addToast = useCallback((message, type = "success", duration = 3500) => {
  const id = Date.now() + Math.random();
  setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
  const t = setTimeout(() => removeToast(id), duration);
  timers.current.set(id, t);
}, []);

// no card do toast:
role={v.role}
onMouseEnter={() => clearTimeout(timers.current.get(toast.id))}
onMouseLeave={() => { const t = setTimeout(() => removeToast(toast.id), 3500); timers.current.set(toast.id, t); }}
// + className max-w-sm
```

### 4.6 Badges, tags, tooltips

**Problema**: `ui/Badge` (pill) e `Ledger.StatusBadge` (rect) são a mesma coisa com receitas diferentes.

**Solução**: unificar a receita de cor (tint `bg/15 border/25` + `*-ink` no texto). Manter as duas formas (pill para tags de contexto, rect para estado em tabelas) — são funções diferentes, cores iguais.

```js
// ui/Badge.js — antes
default:     "border-primary/30 bg-primary/10 text-primary",
destructive: "border-error/30 bg-error/15 text-error",
success:     "border-success/30 bg-success/15 text-success",

// depois (receita única com ink AA)
default:     "border-primary/25 bg-primary/10 text-primary",
destructive: "border-error/25 bg-error/15 text-error-ink",
success:     "border-success/25 bg-success/15 text-success-ink",
warning:     "border-warning/25 bg-warning/15 text-warning-ink",
info:        "border-info/25 bg-info/15 text-info-ink",
```

**Tooltip** (não existe — spec novo, CSS puro; substitui os 101 `title=` quando necessário):
```jsx
export default function Tooltip({ label, children }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
```
Invertido (fundo `foreground`, texto `background`) — sóbrio, sem sombra, contraste máximo nos dois temas.

### 4.7 Tabelas e listas (Ledger)

**Problema**: botão "novo" do `LedgerHeader` recria o primário inline; `FilterRow` com foco diferente; frame `bg-muted/50` vs cards `bg-card` (intencional mas não documentado).

**Solução**: usar `<Button size="sm">` no header; foco canónico no FilterRow; documentar a hierarquia de superfícies.

```js
// LedgerHeader — antes
<button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 … hover:bg-primary/90">

// depois
<Button size="sm" onClick={aoNovo}>
  <Icon name="add" className="text-base" /> {novo}
</Button>

// FilterRow — foco canónico
"… focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 transition-[border-color,box-shadow] …"
```

Hierarquia documentada: **Ledger = contentor de lista** (`bg-muted/50`) que agrupa tabela+filtros; **Card = unidade de conteúdo** (`bg-card`); zebra `odd:bg-card/50` mantém-se (leitura em linhas longas).

### 4.8 Estados vazios, loading, erro

**Problema**: skeletons com `rounded-2xl` (14px hoje, 16px depois do fix — querem 14px de card) e `border-outline-variant/30`; sem `aria-busy`; empty/erro sem componente padrão partilhado.

**Solução**:
- `Skeleton.js`: `rounded-2xl` → `rounded-xl`, `border-outline-variant/30` → `border-border`; envolver em `<div aria-busy="true" aria-hidden="true">` quando substitui conteúdo real (o conteúdo aparece por inteiro quando carregado — sem shimmer, coerente com a regra de sobriedade).
- `LedgerEmpty` é o padrão de empty state (ícone em chip 48px, título, sem decoração) — reutilizar em todo o sistema; adicionar linha secundária opcional `text-xs text-muted-foreground`.
- **Erro**: padronizar como empty state com `icone="error_outline"` + mensagem + `<Button variant="outline" size="sm">Tentar novamente</Button>`.

### 4.9 Navbar/sidebar

**Regras** (aplicar em `Sidebar.js` e `TopBar.js` sem mudar estrutura):
- Item: altura 40px, `rounded-lg`, ícone 22px + rótulo 14px; hover `bg-muted`; ativo = `.nav-pill` (já existe, sólida primária);
- Foco visível `focus-visible:ring-2 ring-ring/40` em cada item;
- Substituir os hex hardcoded (4 em Sidebar, 6 em TopBar) por tokens;
- No mobile (<480px), a sidebar vira overlay com fundo sólido `--background` (sem blur).

---

## 5. Consistência — plano de correção

| Inconsistência | Onde | Correção |
|---|---|---|
| 5 classes de card idênticas | `globals.css` | 1 definição + aliases temporários, remover após grep 0 usos |
| Escala de raios colapsada | `@theme inline` | valores reais (§2.3) |
| 3 focos de input | `.form-input`, `.glass-input`, `Input.js`, `FilterRow` | receita única (§4.3) |
| 2 receitas de badge | `Badge` vs `StatusBadge` | receita única com `*-ink` (§4.6) |
| Botão primário duplicado | `LedgerHeader` | usar `Button` (§4.7) |
| 160 hex hardcoded | 13 ficheiros | migrar para tokens (Avatar: paleta vira constante própria) |
| `--ds-*` duplicado | `globals.css` | remover (§2.5) |
| `.text-caption` uppercase | `globals.css` | remover transform (§2.4) |

**Fases de migração** (cada fase fecha com lint + verificação visual):
1. **Tokens**: reescrever a secção de tokens do `globals.css` (paleta, raios, durações) — componentes ficam iguais visualmente, excepto raio do modal (16px) e cores de status em claro (AA). **Feito em 2026-11-09**: incluiu a normalização de `rounded-2xl` → `rounded-xl` nos cards (ComboKpiCard, FormSection, MaterialCard, MediaCard, Skeleton, MultiSelect, error states, thumbnails) para que só os modais passem a 16px, a remoção do bloco `--ds-*` e a correção de `.text-display`/`.text-caption`.
2. **Componentes core**: Button, Badge, Input/Select, Modal (trap), Toast, Ledger, Skeleton — diffs da secção 4. **Feito em 2026-11-09**: Button (variante `gradient` removida — 0 usos; `default`/`destructive`/`success` com `primary-hover`/`primary-active`/`error-ink`/`*-foreground`; transição `duration-[var(--duration-fast)]`), Badge (receita unificada com `*-ink`), Input/Select (foco canónico `border-primary` + ring 2px/25% + `transition-[border-color,box-shadow]`), Modal (focus trap com `panelRef` + Tab/Shift+Tab), Toast (roles por tipo, pausa no hover, máx. 4, chips `*-ink`), Ledger (botão "novo" usa `Button size="sm"`, `StatusBadge` com `*-ink`, `FilterRow` com foco canónico), KpiCard (`active` = `border-primary ring-primary/25`), `globals.css` (`.form-*`, `.glass-input`, `.input-glow`, `.card`, `.fluid-card` com durações via tokens e `:focus-visible` 2px/25%).
3. **Limpeza**: remover CSS morto/neutralizado (~200 linhas) após confirmar 0 usos com grep; migrar hex hardcoded para tokens.

---

## 6. Checklist final de acessibilidade e consistência

- [ ] Contraste AA: texto de status usa `*-ink`; `muted-foreground` ≥ 4.5:1 nos dois temas
- [ ] Foco visível idêntico em botões, links, inputs, itens de navegação (teclado)
- [ ] Modal: `role="dialog"` + `aria-modal` + `aria-labelledby` + trap + ESC + scroll lock + foco inicial
- [ ] Toast: `role="alert"` só para erro/aviso; `status` para sucesso/info; pausa no hover; máximo 4
- [ ] `prefers-reduced-motion` respeitado (já global — manter ao adicionar transições)
- [ ] Alvos de toque ≥ 44px nas ações primárias em mobile
- [ ] Rótulos sem maiúsculas (incluindo `.text-caption`)
- [ ] Sem gradientes, blur, glass, sombras coloridas, emojis como ícones
- [ ] Valores com `tabular-nums`; NIF/códigos em mono
- [ ] Nenhum hex fora dos tokens (excepto paleta de avatares, documentada)
- [ ] Uma cor de destaque por ecrã; verde/laranja/vermelho só como estado

---

## 7. Perguntas em aberto

1. **Tema escuro — cor primária**: manter o branco "console" atual (botões brancos) ou voltar a um azul de marca (#4d94ff-ish)? Recomendo manter — é distinto e já é a identidade atual.
2. **Overlay do modal**: hoje `bg-black/40`. Mantenho ou aligeiro (`bg-black/25`)?
3. **Cores de status em claro vão escurecer** (AA): `#10b981` → `#059669` etc. É uma mudança visível no tema claro — ok?
4. **Remoção do CSS morto** (~200 linhas neutralizadas) autorizada na fase 3?
5. **Tooltip**: criar o componente e migrar os `title=` nativos aos poucos, ou deixar os nativos como estão?
