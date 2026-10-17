"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/Toast";
import { Input, Select } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/Ledger";
import { CardSkeleton } from "@/components/Skeleton";
import Icon from "@/components/Icon";
import { getImageUrl } from "@/lib/utils";
import {
  buscarOrganizacao, guardarOrganizacao,
  buscarSistema, guardarSistema,
  buscarSeguranca, guardarSeguranca,
  uploadLogo, buscarUtilizadorAtual,
  alterarEmail, alterarSenha,
} from "@/services/configuracoes";


const CONTRATO_TEMPLATE = ``;

const SIS_PADRAO = {
  idioma: "Português",
  formato_data: "DD/MM/AAAA",
  moeda: "Kwanza (AOA)",
  fuso_horario: "Africa/Luanda (GMT+1)",
  dias_aviso_ferias: 30,
  limite_ficheiros: 10,
};

const SEG_PADRAO = { tfa_ativo: true, forcar_senha: true, bloqueio_bruta: true, sessao_inativa: false };

const SECCOES = [
  { id: "organizacao", label: "Organização", titulo: "Organização", sub: "Dados da organização e identidade", desc: "Dados da empresa e identidade", icon: "business" },
  { id: "sistema", label: "Sistema", titulo: "Sistema", sub: "Parâmetros gerais do sistema", desc: "Idioma, moeda e aparência", icon: "settings" },
  { id: "seguranca", label: "Segurança", titulo: "Segurança", sub: "Acesso e privacidade", desc: "Acesso e privacidade", icon: "shield" },
  { id: "conta", label: "Conta", titulo: "Conta de Utilizador", sub: "Email, senha e dados pessoais", desc: "Email, senha e perfil", icon: "person" },
];

const tabClsBase =
  "-mb-px inline-flex items-center whitespace-nowrap border-b-2 px-1 pb-3 pt-2 text-xs font-medium transition-colors";
const tabClsAtiva = "border-primary font-semibold text-primary";
const tabClsInativa = "border-transparent text-muted-foreground hover:border-border hover:text-foreground";

const btnAcaoBase =
  "inline-flex min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all md:text-sm";

const estiloBotao = {
  primary: `${btnAcaoBase} bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`,
  neutro: `${btnAcaoBase} border border-border bg-muted/50 text-foreground shadow-sm hover:bg-muted`,
  error: `${btnAcaoBase} border border-error/25 bg-error/5 text-error shadow-sm hover:bg-error/10`,
};

function Toggle({ ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${
        ativo ? "bg-primary" : "bg-muted"
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${ativo ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SecurityItem({ icon, label, desc, ativo, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:bg-muted">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name={icon} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-normal text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Toggle ativo={ativo} onClick={onClick} />
    </div>
  );
}

function AccordionItem({ icon, label, aberto, onClick, children }) {
  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Icon name={icon} className="shrink-0 text-muted-foreground" />
          <span className="text-sm font-normal text-foreground">{label}</span>
        </div>
        <Icon name={aberto ? "expand_less" : "expand_more"} className="shrink-0 text-muted-foreground" />
      </button>
      {aberto && <div className="space-y-3.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { dark, toggleTheme } = useTheme();
  const { addToast } = useToast() || {};

  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState("organizacao");
  const [org, setOrg] = useState({ nome: "", sigla: "", endereco: "", telefone: "", email: "", nif: "", website: "", logo_url: "", template_contrato: CONTRATO_TEMPLATE });
  const [sis, setSis] = useState(SIS_PADRAO);
  const [seg, setSeg] = useState(SEG_PADRAO);
  const [userAtual, setUserAtual] = useState({});
  const [mostrarAlterarEmail, setMostrarAlterarEmail] = useState(false);
  const [mostrarAlterarSenha, setMostrarAlterarSenha] = useState(false);
  const [emailForm, setEmailForm] = useState({ novo_email: "", senha_atual: "" });
  const [senhaForm, setSenhaForm] = useState({ senha_atual: "", nova_senha: "", confirmar_senha: "" });

  useEffect(() => {
    Promise.all([
      buscarOrganizacao().catch(() => null),
      buscarSistema().catch(() => null),
      buscarSeguranca().catch(() => null),
      buscarUtilizadorAtual().catch(() => null),
    ]).then(([o, s, sg, u]) => {
      if (o) setOrg((prev) => ({ ...prev, ...o, template_contrato: o.template_contrato || CONTRATO_TEMPLATE }));
      if (s) setSis(s);
      if (sg) setSeg(sg);
      if (u) setUserAtual(u);
    }).finally(() => setCarregando(false));
  }, []);

  const notificar = (msg, tipo = "success") => addToast?.(msg, tipo);

  const handleGuardar = async (fn, successMsg, errorMsg) => {
    try { await fn(); notificar(successMsg); }
    catch { notificar(errorMsg || "Erro ao guardar", "error"); }
  };

  const guardarAtual = () => {
    if (aba === "organizacao") return handleGuardar(() => guardarOrganizacao(org), "Dados da organização guardados");
    if (aba === "sistema") return handleGuardar(() => guardarSistema(sis), "Parâmetros do sistema guardados");
    if (aba === "seguranca") return handleGuardar(() => guardarSeguranca(seg), "Configurações de segurança guardadas");
    notificar("Não há alterações a guardar nesta secção", "info");
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file);
      setOrg((prev) => ({ ...prev, logo_url: res.logo_url }));
      notificar("Logo atualizado com sucesso");
    } catch (e) { notificar(e?.response?.data?.erro || "Erro ao fazer upload do logo", "error"); }
  };

  const handleAlterarEmail = async () => {
    try {
      await alterarEmail(emailForm);
      notificar("Email alterado com sucesso");
      setMostrarAlterarEmail(false);
      setEmailForm({ novo_email: "", senha_atual: "" });
    } catch { notificar("Erro ao alterar email", "error"); }
  };

  const handleAlterarSenha = async () => {
    try {
      await alterarSenha(senhaForm);
      notificar("Senha alterada com sucesso");
      setMostrarAlterarSenha(false);
      setSenhaForm({ senha_atual: "", nova_senha: "", confirmar_senha: "" });
    } catch { notificar("Erro ao alterar senha", "error"); }
  };

  const handleGerarPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    let y = margin;
    const pageW = 210 - margin * 2;

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(
      org.template_contrato
        .replace(/{NOME_ORGANIZACAO}/g, org.nome || "[Nome da Organização]")
        .replace(/{NIF_ORGANIZACAO}/g, org.nif || "[NIF]")
        .replace(/{MORADA_ORGANIZACAO}/g, org.endereco || "[Endereço]"),
      pageW
    );

    lines.forEach((line) => {
      if (y > 290) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 5;
    });

    doc.save("contrato_trabalho.pdf");
    notificar("PDF do contrato gerado com sucesso");
  };

  const seccao = SECCOES.find((s) => s.id === aba) || SECCOES[0];

  const proteccoesActivas = [seg.tfa_ativo, seg.forcar_senha, seg.bloqueio_bruta, seg.sessao_inativa].filter(Boolean).length;

  const resumo = {
    organizacao: { valor: org.nome || "—", badge: org.nif ? `NIF ${org.nif}` : "Sem NIF", tom: org.nome ? "info" : "neutral" },
    sistema: { valor: sis.moeda || "—", badge: [sis.idioma, sis.formato_data].filter(Boolean).join(" · "), tom: "neutral" },
    seguranca: { valor: `${proteccoesActivas}/4`, badge: proteccoesActivas >= 3 ? "Protecções activas" : "Rever protecções", tom: proteccoesActivas >= 3 ? "success" : "warning" },
    conta: { valor: userAtual.nome || "—", badge: userAtual.funcao || "—", tom: "info" },
  }[aba];

  const acoes = {
    organizacao: [
      { label: "Guardar", icon: "save", estilo: "primary", onClick: () => handleGuardar(() => guardarOrganizacao(org), "Dados da organização guardados") },
      { label: "Gerar PDF", icon: "picture_as_pdf", estilo: "error", onClick: handleGerarPDF },
      { label: "Alterar Logo", icon: "upload", estilo: "neutro", htmlFor: "logo-upload" },
    ],
    sistema: [
      { label: "Guardar Parâmetros", icon: "save", estilo: "primary", onClick: () => handleGuardar(() => guardarSistema(sis), "Parâmetros do sistema guardados") },
      { label: "Repor Predefinições", icon: "restart_alt", estilo: "neutro", onClick: () => { setSis(SIS_PADRAO); notificar("Parâmetros repostos para as predefinições"); } },
      { label: dark ? "Modo Claro" : "Modo Escuro", icon: dark ? "light_mode" : "dark_mode", estilo: "neutro", onClick: toggleTheme },
    ],
    seguranca: [
      { label: "Guardar Segurança", icon: "save", estilo: "primary", onClick: () => handleGuardar(() => guardarSeguranca(seg), "Configurações de segurança guardadas") },
      { label: "Repor Predefinições", icon: "restart_alt", estilo: "neutro", onClick: () => { setSeg(SEG_PADRAO); notificar("Segurança reposta para as predefinições"); } },
    ],
    conta: [
      { label: "Alterar Email", icon: "email", estilo: "neutro", onClick: () => { setAba("conta"); setMostrarAlterarEmail(true); } },
      { label: "Alterar Senha", icon: "lock", estilo: "neutro", onClick: () => { setAba("conta"); setMostrarAlterarSenha(true); } },
    ],
  }[aba];

  if (carregando) {
    return (
      <div className="space-y-6">
        <CardSkeleton lines={2} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5"><CardSkeleton lines={8} /></div>
          <div className="lg:col-span-7"><CardSkeleton lines={12} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações do Sistema</h1>
          <p className="mt-1 text-xs text-muted-foreground">Ajustes, utilizadores e parâmetros gerais de funcionamento da plataforma.</p>
        </div>
        <button
          type="button"
          onClick={guardarAtual}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Icon name="check" className="text-base" /> Guardar Alterações
        </button>
      </div>

      <div className="border-b border-border">
        <div className="flex flex-wrap gap-x-6 -mb-px">
          {SECCOES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setAba(s.id)}
              aria-pressed={aba === s.id}
              className={`${tabClsBase} ${aba === s.id ? tabClsAtiva : tabClsInativa}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:col-span-4">
          <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">Definições disponíveis</h3>
          <ul className="space-y-1">
            {SECCOES.map((s) => {
              const ativa = aba === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setAba(s.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all ${
                      ativa ? "bg-primary/10 text-primary ring-1 ring-primary/15" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        ativa ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <Icon name={s.icon} className="text-base" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${ativa ? "font-semibold text-primary" : "font-medium text-foreground"}`}>{s.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{s.desc}</span>
                    </span>
                    <Icon name="chevron_right" className={`shrink-0 text-base ${ativa ? "text-primary" : "text-border"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm lg:col-span-8">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{seccao.titulo}</h3>
              <span className="text-xs text-muted-foreground">{seccao.sub}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:block sm:text-right">
              <div className="truncate text-lg font-black tracking-tight text-foreground md:text-xl">{resumo.valor}</div>
              <StatusBadge tom={resumo.tom} className="mt-0.5">{resumo.badge}</StatusBadge>
            </div>
          </div>

          <div className="flex-1 space-y-5 px-5 py-5">
            {aba === "organizacao" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Nome da Organização" obrigatorio>
                    <Input value={org.nome} onChange={(e) => setOrg((p) => ({ ...p, nome: e.target.value }))} />
                  </FormField>
                  <FormField label="Sigla / Nome Curto">
                    <Input value={org.sigla || ""} onChange={(e) => setOrg((p) => ({ ...p, sigla: e.target.value }))} />
                  </FormField>
                  <FormField label="Endereço">
                    <Input value={org.endereco || ""} onChange={(e) => setOrg((p) => ({ ...p, endereco: e.target.value }))} />
                  </FormField>
                  <FormField label="Telefone">
                    <Input value={org.telefone || ""} onChange={(e) => setOrg((p) => ({ ...p, telefone: e.target.value }))} />
                  </FormField>
                  <FormField label="Email Institucional">
                    <Input type="email" value={org.email || ""} onChange={(e) => setOrg((p) => ({ ...p, email: e.target.value }))} />
                  </FormField>
                  <FormField label="NIF">
                    <Input value={org.nif || ""} onChange={(e) => setOrg((p) => ({ ...p, nif: e.target.value }))} />
                  </FormField>
                </div>

                <FormField label="Website">
                  <Input value={org.website || ""} onChange={(e) => setOrg((p) => ({ ...p, website: e.target.value }))} />
                </FormField>

                <FormField label="Modelo de Contrato de Trabalho" hint="Use placeholders como {NOME_COLABORADOR}, {NIF}, {SALARIO}, etc.">
                  <textarea
                    value={org.template_contrato}
                    onChange={(e) => setOrg((p) => ({ ...p, template_contrato: e.target.value }))}
                    className="h-48 w-full resize-y rounded-xl border border-input bg-background p-4 font-mono text-xs leading-relaxed text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                      {org.logo_url ? (
                        <Image src={getImageUrl(org.logo_url)} alt="Logo" className="h-full w-full object-contain" width={64} height={64} />
                      ) : (
                        <Icon name="image" className="text-2xl text-primary/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Logo da Organização</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG ou SVG • Máx 2MB</p>
                    </div>
                  </div>
                  <input id="logo-upload" type="file" accept="image/png,image/jpg,image/jpeg,image/svg+xml" className="hidden" onChange={handleUploadLogo} />
                </div>
              </>
            )}

            {aba === "sistema" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Idioma do Sistema">
                    <Select value={sis.idioma} onChange={(e) => setSis((p) => ({ ...p, idioma: e.target.value }))}>
                      <option>Português</option><option>Inglês</option><option>Francês</option>
                    </Select>
                  </FormField>
                  <FormField label="Formato de Data">
                    <Select value={sis.formato_data} onChange={(e) => setSis((p) => ({ ...p, formato_data: e.target.value }))}>
                      <option>DD/MM/AAAA</option><option>MM/DD/AAAA</option><option>AAAA/MM/DD</option>
                    </Select>
                  </FormField>
                  <FormField label="Moeda">
                    <Select value={sis.moeda} onChange={(e) => setSis((p) => ({ ...p, moeda: e.target.value }))}>
                      <option>Kwanza (AOA)</option><option>Dólar (USD)</option><option>Euro (EUR)</option>
                    </Select>
                  </FormField>
                  <FormField label="Fuso Horário">
                    <Select value={sis.fuso_horario} onChange={(e) => setSis((p) => ({ ...p, fuso_horario: e.target.value }))}>
                      <option>Africa/Luanda (GMT+1)</option><option>UTC</option><option>Africa/Lagos (GMT+1)</option>
                    </Select>
                  </FormField>
                  <FormField label="Dias para Aviso de Férias">
                    <Input type="number" value={sis.dias_aviso_ferias} onChange={(e) => setSis((p) => ({ ...p, dias_aviso_ferias: Number(e.target.value) }))} />
                  </FormField>
                  <FormField label="Limite de Ficheiros (MB)">
                    <Input type="number" value={sis.limite_ficheiros} onChange={(e) => setSis((p) => ({ ...p, limite_ficheiros: Number(e.target.value) }))} />
                  </FormField>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={dark ? "dark_mode" : "light_mode"} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-normal text-foreground">Modo Escuro</p>
                      <p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro</p>
                    </div>
                  </div>
                  <Toggle ativo={dark} onClick={toggleTheme} />
                </div>
              </>
            )}

            {aba === "seguranca" && (
              <div className="space-y-4">
                <SecurityItem icon="lock" label="2FA" desc="Requerer código adicional durante o login" ativo={seg.tfa_ativo} onClick={() => setSeg((p) => ({ ...p, tfa_ativo: !p.tfa_ativo }))} />
                <SecurityItem icon="calendar_month" label="Alterar Senha" desc="Forçar mudança de senha a cada 90 dias" ativo={seg.forcar_senha} onClick={() => setSeg((p) => ({ ...p, forcar_senha: !p.forcar_senha }))} />
                <SecurityItem icon="shield" label="Bloqueio de Força Bruta" desc="Bloquear após 5 tentativas falhadas" ativo={seg.bloqueio_bruta} onClick={() => setSeg((p) => ({ ...p, bloqueio_bruta: !p.bloqueio_bruta }))} />
                <SecurityItem icon="schedule" label="Sessão Inativa" desc="Encerrar sessão após 30 min de inatividade" ativo={seg.sessao_inativa} onClick={() => setSeg((p) => ({ ...p, sessao_inativa: !p.sessao_inativa }))} />
              </div>
            )}

            {aba === "conta" && (
              <>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-2 ring-border">
                    {(userAtual.nome || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Nome Completo</span>
                      <span className="truncate text-xs font-semibold text-foreground">{userAtual.nome || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <span className="truncate text-xs font-semibold text-foreground">{userAtual.email || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Tipo</span>
                      <StatusBadge tom="info">{userAtual.funcao || "—"}</StatusBadge>
                    </div>
                  </div>
                </div>

                <AccordionItem icon="email" label="Alterar Email" aberto={mostrarAlterarEmail} onClick={() => setMostrarAlterarEmail(!mostrarAlterarEmail)}>
                  <FormField label="Novo Email">
                    <Input value={emailForm.novo_email} onChange={(e) => setEmailForm((p) => ({ ...p, novo_email: e.target.value }))} placeholder="novo@email.co.ao" />
                  </FormField>
                  <FormField label="Senha Atual">
                    <Input type="password" value={emailForm.senha_atual} onChange={(e) => setEmailForm((p) => ({ ...p, senha_atual: e.target.value }))} placeholder="••••••••" />
                  </FormField>
                  <button type="button" className={`${estiloBotao.primary} w-full`} onClick={handleAlterarEmail}>
                    <Icon name="save" className="text-sm" />
                    Guardar
                  </button>
                </AccordionItem>

                <AccordionItem icon="lock" label="Alterar Senha" aberto={mostrarAlterarSenha} onClick={() => setMostrarAlterarSenha(!mostrarAlterarSenha)}>
                  <FormField label="Senha Atual">
                    <Input type="password" value={senhaForm.senha_atual} onChange={(e) => setSenhaForm((p) => ({ ...p, senha_atual: e.target.value }))} placeholder="••••••••" />
                  </FormField>
                  <FormField label="Nova Senha">
                    <Input type="password" value={senhaForm.nova_senha} onChange={(e) => setSenhaForm((p) => ({ ...p, nova_senha: e.target.value }))} placeholder="Nova senha" />
                  </FormField>
                  <FormField label="Confirmar Senha">
                    <Input type="password" value={senhaForm.confirmar_senha} onChange={(e) => setSenhaForm((p) => ({ ...p, confirmar_senha: e.target.value }))} placeholder="Confirmar nova senha" />
                  </FormField>
                  <button type="button" className={`${estiloBotao.primary} w-full`} onClick={handleAlterarSenha}>
                    <Icon name="save" className="text-sm" />
                    Guardar
                  </button>
                </AccordionItem>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border px-5 py-4 sm:grid-cols-3">
            {acoes.map((a) =>
              a.htmlFor ? (
                <label key={a.label} htmlFor={a.htmlFor} className={`${estiloBotao[a.estilo]} cursor-pointer`}>
                  <Icon name={a.icon} className="text-sm" />
                  <span className="truncate">{a.label}</span>
                </label>
              ) : (
                <button key={a.label} type="button" className={estiloBotao[a.estilo]} onClick={a.onClick}>
                  <Icon name={a.icon} className="text-sm" />
                  <span className="truncate">{a.label}</span>
                </button>
              )
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
