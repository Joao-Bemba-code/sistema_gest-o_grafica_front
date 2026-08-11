"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/components/Toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
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
import { baixarBackup } from "@/services/backup";

const CONTRATO_TEMPLATE = ``;

const SECTIONS = {
  organizacao: { icon: "business", title: "Organização", desc: "Dados da Organização" },
  sistema: { icon: "settings", title: "Sistema", desc: "Parâmetros do Sistema" },
  seguranca: { icon: "shield", title: "Segurança", desc: "Acesso e Privacidade" },
};

function Toggle({ ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${
        ativo ? "bg-primary" : "bg-muted-foreground/25"
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${ativo ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon name={icon} className="text-primary" />
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </div>
    </div>
  );
}

function SecurityItem({ icon, label, desc, ativo, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4 transition-all hover:bg-muted/50">
      <div className="flex items-start gap-3 min-w-0">
        <Icon name={icon} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Toggle ativo={ativo} onClick={onClick} />
    </div>
  );
}

function AccordionItem({ icon, label, aberto, onClick, children }) {
  return (
    <div className="border-t pt-4">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-xl p-3 transition-all hover:bg-accent"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon name={icon} className="shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <Icon name={aberto ? "expand_less" : "expand_more"} className="shrink-0 text-muted-foreground" />
      </button>
      {aberto && <div className="space-y-3.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { addToast } = useToast() || {};
  const logoRef = useRef();

  const [carregando, setCarregando] = useState(true);
  const [org, setOrg] = useState({ nome: "", sigla: "", endereco: "", telefone: "", email: "", nif: "", website: "", logo_url: "", template_contrato: CONTRATO_TEMPLATE });
  const [sis, setSis] = useState({ idioma: "Português", formato_data: "DD/MM/AAAA", moeda: "Kwanza (AOA)", fuso_horario: "Africa/Luanda (GMT+1)", dias_aviso_ferias: 30, limite_ficheiros: 10 });
  const [seg, setSeg] = useState({ tfa_ativo: true, forcar_senha: true, bloqueio_bruta: true, sessao_inativa: false });
  const [userAtual, setUserAtual] = useState({});
  const [mostrarAlterarEmail, setMostrarAlterarEmail] = useState(false);
  const [mostrarAlterarSenha, setMostrarAlterarSenha] = useState(false);
  const [emailForm, setEmailForm] = useState({ novo_email: "", senha_atual: "" });
  const [senhaForm, setSenhaForm] = useState({ senha_atual: "", nova_senha: "", confirmar_senha: "" });
  const [baixando, setBaixando] = useState(false);

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

  const handleBaixarBackup = async () => {
    setBaixando(true);
    try {
      const nome = await baixarBackup();
      notificar(`Backup ${nome} gerado com sucesso`);
    } catch {
      notificar("Erro ao gerar o backup", "error");
    } finally {
      setBaixando(false);
    }
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

  if (carregando) {
    return (
      <div className="space-y-6">
        <CardSkeleton lines={2} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><CardSkeleton lines={12} /></div>
          <div><CardSkeleton lines={10} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Configurações</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Parâmetros e definições do sistema // CFG</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <SectionHeader icon="business" title="Organização" desc="Dados da Organização" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nome da Organização" required>
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

              <div className="space-y-2">
                <FormField label="Modelo de Contrato de Trabalho">
                  <p className="text-xs text-muted-foreground/70 -mt-1">
                    Use placeholders como {'{NOME_COLABORADOR}'}, {'{NIF}'}, {'{SALARIO}'}, etc.
                  </p>
                  <textarea
                    value={org.template_contrato}
                    onChange={(e) => setOrg((p) => ({ ...p, template_contrato: e.target.value }))}
                    className="w-full h-56 rounded-xl border border-input bg-background p-4 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                  />
                </FormField>
                <Button variant="outline" size="sm" onClick={handleGerarPDF}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Gerar PDF
                </Button>
              </div>

              <div className="flex items-center justify-between gap-6 rounded-xl border bg-muted/30 p-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 overflow-hidden">
                     {org.logo_url ? (
                      <Image src={getImageUrl(org.logo_url)} alt="Logo" className="h-full w-full object-contain" width={64} height={64} />
                    ) : (
                      <Icon name="image" className="text-2xl text-primary/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Logo da Organização</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou SVG • Máx 2MB</p>
                  </div>
                </div>
                <div className="shrink-0">
                  <input ref={logoRef} type="file" accept="image/png,image/jpg,image/jpeg,image/svg+xml" className="hidden" onChange={handleUploadLogo} />
                  <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                    <Icon name="upload" className="text-sm" />
                    Alterar Logo
                  </Button>
                </div>
              </div>

              <div className="flex justify-end border-t pt-5">
                <Button onClick={() => handleGuardar(() => guardarOrganizacao(org), "Dados da organização guardados")}>
                  <Icon name="save" className="text-sm" />
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader icon="settings" title="Sistema" desc="Parâmetros do Sistema" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Idioma do Sistema">
                  <select
                    value={sis.idioma}
                    onChange={(e) => setSis((p) => ({ ...p, idioma: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option>Português</option><option>Inglês</option><option>Francês</option>
                  </select>
                </FormField>
                <FormField label="Formato de Data">
                  <select
                    value={sis.formato_data}
                    onChange={(e) => setSis((p) => ({ ...p, formato_data: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option>DD/MM/AAAA</option><option>MM/DD/AAAA</option><option>AAAA/MM/DD</option>
                  </select>
                </FormField>
                <FormField label="Moeda">
                  <select
                    value={sis.moeda}
                    onChange={(e) => setSis((p) => ({ ...p, moeda: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option>Kwanza (AOA)</option><option>Dólar (USD)</option><option>Euro (EUR)</option>
                  </select>
                </FormField>
                <FormField label="Fuso Horário">
                  <select
                    value={sis.fuso_horario}
                    onChange={(e) => setSis((p) => ({ ...p, fuso_horario: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option>Africa/Luanda (GMT+1)</option><option>UTC</option><option>Africa/Lagos (GMT+1)</option>
                  </select>
                </FormField>
                <FormField label="Dias para Aviso de Férias">
                  <Input type="number" value={sis.dias_aviso_ferias} onChange={(e) => setSis((p) => ({ ...p, dias_aviso_ferias: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Limite de Ficheiros (MB)">
                  <Input type="number" value={sis.limite_ficheiros} onChange={(e) => setSis((p) => ({ ...p, limite_ficheiros: Number(e.target.value) }))} />
                </FormField>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Icon name={dark ? "dark_mode" : "light_mode"} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Modo Escuro</p>
                    <p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro</p>
                  </div>
                </div>
                <Toggle ativo={dark} onClick={toggleTheme} />
              </div>

              <div className="flex justify-end border-t pt-5">
                <Button onClick={() => handleGuardar(() => guardarSistema(sis), "Parâmetros do sistema guardados")}>
                  <Icon name="save" className="text-sm" />
                  Guardar Parâmetros do Sistema
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader icon="archive" title="Backup e Restauro" desc="Cópia de segurança dos dados" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Baixa um ficheiro ZIP com toda a base de dados e ficheiros (uploads). Guarda-o num local seguro
                (pen, disco externo ou nuvem) para recuperares os dados em caso de avaria ou reinstalação.
              </p>
              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon name="download" className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Backup completo</p>
                  <p className="text-[11px] text-muted-foreground">Base de dados + uploads • em formato ZIP</p>
                </div>
              </div>
              <Button className="w-full" onClick={handleBaixarBackup} loading={baixando}>
                <Icon name="archive" className="text-sm" />
                {baixando ? "A gerar backup..." : "Baixar Backup (ZIP)"}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                O sistema também cria backups automáticos em cada arranque (guardados em %APPDATA%\sigraf-desktop\backups).
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <SectionHeader icon="shield" title="Segurança" desc="Acesso e Privacidade" />
            </CardHeader>
            <CardContent className="space-y-4">
              <SecurityItem icon="lock" label="2FA" desc="Requerer código adicional durante o login" ativo={seg.tfa_ativo} onClick={() => setSeg((p) => ({ ...p, tfa_ativo: !p.tfa_ativo }))} />
              <SecurityItem icon="lock" label="Alterar Senha" desc="Forçar mudança de senha a cada 90 dias" ativo={seg.forcar_senha} onClick={() => setSeg((p) => ({ ...p, forcar_senha: !p.forcar_senha }))} />
              <SecurityItem icon="lock" label="Bloqueio de Força Bruta" desc="Bloquear após 5 tentativas falhadas" ativo={seg.bloqueio_bruta} onClick={() => setSeg((p) => ({ ...p, bloqueio_bruta: !p.bloqueio_bruta }))} />
              <SecurityItem icon="lock" label="Sessão Inativa" desc="Encerrar sessão após 30 min de inatividade" ativo={seg.sessao_inativa} onClick={() => setSeg((p) => ({ ...p, sessao_inativa: !p.sessao_inativa }))} />

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-foreground mb-3.5">Utilizador Atual</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Nome Completo</span>
                    <span className="text-xs font-semibold text-foreground text-right">{userAtual.nome || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Email</span>
                    <span className="text-xs font-semibold text-foreground text-right break-all">{userAtual.email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Tipo</span>
                    <Badge variant="info" className="text-[10px]">{userAtual.funcao || "—"}</Badge>
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
                <Button size="sm" className="w-full" onClick={handleAlterarEmail}>
                  <Icon name="save" className="text-sm" />
                  Guardar
                </Button>
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
                <Button size="sm" className="w-full" onClick={handleAlterarSenha}>
                  <Icon name="save" className="text-sm" />
                  Guardar
                </Button>
              </AccordionItem>

              <div className="pt-2">
                <Button size="sm" className="w-full" onClick={() => handleGuardar(() => guardarSeguranca(seg), "Configurações de segurança guardadas")}>
                  <Icon name="save" className="text-sm" />
                  Guardar Segurança
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
