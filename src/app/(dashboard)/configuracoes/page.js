"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  buscarOrganizacao, guardarOrganizacao,
  buscarSistema, guardarSistema,
  buscarSeguranca, guardarSeguranca,
  uploadLogo, buscarUtilizadorAtual,
  alterarEmail, alterarSenha,
} from "@/services/configuracoes";

const CONTRATO_TEMPLATE = `CONTRATO DE TRABALHO

ENTRE
(nome completo), (estado civil), natural de Kuito, província Bié, com domicílio profissional em Luanda, rua 22 de Janeiro, Nova Urbanização, Junto ao Siac, Cacuaco, que outorga na qualidade de sócio-gerente em representação da sociedade comercial quotas com a firma {NOME_ORGANIZACAO}, {NIF_ORGANIZACAO}, com sede na {MORADA_ORGANIZACAO}, com o capital social de 100.000,00 cem kwanzas mil, matriculada na Conservatória de Registo Comercial de Luanda Sob o número 38.211-22/2120816 adiante designada por PRIMEIRA CONTRAENTE ou ENTIDADE EMPREGADORA

E
{NOME_COLABORADOR}, {ESTADO_CIVIL}, NIF {NIF_COLABORADOR}, natural de {NATURAL_DE}, residente em {RESIDENCIA}, portador do Bilhete de Identidade, número {BI_COLABORADOR}, emitido por ............. em .........., adiante designado por SEGUNDO CONTRAENTE ou TRABALHADOR

É celebrado o presente contrato de trabalho que se rege pelas disposições da Lei Geral do Trabalho (L.G.T) e respectiva legislação complementar, pelos regulamentos internos e ainda pelas seguintes cláusulas:

CLÁUSULA PRIMEIRA
Categoria Profissional

A Entidade Empregadora admite ao seu serviço para a satisfação de necessidades temporárias de trabalho, o trabalhador com a categoria profissional de {CATEGORIA_PROFISSIONAL}, ficando este, no que diz respeito ao desempenho das tarefas que lhe forem confiadas, sob autoridade e direcção da primeira contraente.

CLÁUSULA SEGUNDA
Duração

O presente contrato tem início em {DATA_INICIO} e vigorará pelo tempo necessário à satisfação das necessidades temporárias da empresa, caducando, para todos os efeitos quando as mesmas deixarem de se verificar.

CLÁUSULA TERCEIRA
Motivo Justificativo

O motivo justificativo da celebração do presente contrato a termo incerto, e que é do conhecimento do trabalhador, tem por base a satisfação de necessidades temporárias da empresa, a saber na descrição de cargos conforme o anexo I.

CLÁUSULA QUARTA
Local de Trabalho

O local de prestação de trabalho será no estabelecimento da Entidade Empregadora, sito na {LOCAL_TRABALHO} ou noutro que venha possuir, arrendar ou explorar, sempre que tal se mostre necessário para o bom e efectivo exercício das funções que constituem o objecto do presente contrato.

CLÁUSULA QUINTA
Horário de Trabalho

O trabalhador obriga-se a prestar {HORARIO_TRABALHO} horas semanais distribuídas por (__ ) dias por semana com intervalo para refeição, de acordo com o horário em vigor no seio da Entidade Empregadora.

CLÁUSULA SEXTA
Retribuição

1. Como contrapartida do trabalho prestado a Entidade Empregadora compromete-se a pagar ao trabalhador a retribuição mensal de {SALARIO_BASE}, sujeita aos descontos legais e paga 12 meses por ano, acrescida de duodécimos de subsídio de natal e de férias calculados nos termos da lei.

2. O trabalhador terá ainda o direito ao valor de {SUBSIDIO_ALIMENTACAO}, referente ao subsídio de alimentação por cada dia de trabalho efectivo, não sendo este valor considerado para efeitos de cálculo dos duodécimos previstos no número anterior.

3. As remunerações previstas nos números anteriores serão pagas até ao quinto dia útil do mês posterior a que respeitam através de transferência bancária.

CLÁUSULA SÉTIMA
Deveres do Trabalhador

1. O trabalhador, aceitando ser admitido ao serviço da Entidade Empregadora, obriga-se ao cumprimento dos regulamentos e determinações escritas ou resultantes das práticas internas e usuais desta, bem como do preceituado na contratação colectiva e demais legislação aplicável e ainda mais especificamente:

a) Comparecer ao serviço com assiduidade e realizar o trabalho com zelo e diligência, visando a melhoria da produtividade da empresa;

b) Executar todos os trabalhos com zelo e dedicação, ao serviço e no interesse da Entidade Empregadora, cumprindo estritamente as ordens e instruções dos seus superiores hierárquicos;

c) Cumprir pontualmente o seu horário de trabalho, só prestando trabalho suplementar quando tal for determinado pelos seus superiores hierárquicos competentes para o efeito e dentro dos pressupostos definidos na lei;

d) Guardar sigilo absoluto em todos os assuntos relacionados com a actividade da Entidade Empregadora e não guardar para si ou para terceiros cópias, duplicatos ou documentos daquela;

e) Não exercer fora da actividade prestada à Entidade Empregadora qualquer actividade remunerada sem que para tanto tenha autorização escrita daquela;

f) Deslocar-se ao serviço e a expensas da Entidade Empregadora, a qualquer localidade do país ou estrangeiro, sempre que tais deslocações sejam necessárias ao exercício da actividade da primeira outorgante;

g) Guardar lealdade à Entidade Empregadora e cumprir as demais obrigações decorrentes do contrato e das normas que o regem;

h) Responsabilizar-se pela guarda e adequada utilização e conservação de todos os bens e valores que no âmbito do presente contrato, sejam por ele recebido e manuseado ou por qualquer outra forma se encontrem à sua guarda, responsabilizar-se nos termos gerais pelo ressarcimento de quaisquer prejuízos que venha a causar directa ou indirectamente por um negligente desempenho das suas funções, nomeadamente extravio de bens e valores ou sua danificação, sem prejuízo de um eventual procedimento disciplinar ou criminal;

i) Abster-se de ter conduta que possa prejudicar o bom nome e a imagem da Entidade Empregadora e seus representantes.

CLÁUSULA OITAVA
Confidencialidade

1. As partes acordam atribuir confidencialidade a toda e qualquer informação decorrente do presente contrato.

2. Considera-se existir informação confidencial da Entidade Empregadora, designadamente, a que disser respeito aos segredos comerciais, aos seus métodos de produção e comercialização e demais operativas, toda a sua estratégia de marketing, a sua técnica de formação de pessoal, estudos de mercado, planos de expansão e respectivos timings, identificação de potencial clientela, técnicas de penetração no mercado e todos os demais segredos e usos comerciais e industriais que mereçam a tutela do direito a nível de concorrência ou outro.

3. Durante a execução do presente contrato e nos anos subsequentes à cessação do mesmo, o trabalhador obriga-se a não desenvolver, directa ou indirectamente por conta própria ou de outrem qualquer actividade que possa conflituar ou concorrer com a actividade da Entidade Empregadora.

CLÁUSULA NONA
Poderes da Entidade Empregadora

Compete à Entidade Empregadora:
1. Definir as funções e tarefas do trabalhador, de acordo com as aptidões e competências deste.
2. Regulamentar o modo de prestação de trabalho do trabalhador.

CLÁUSULA DÉCIMA
Dúvidas e Omissões

Na integração de lacunas e resolução de dúvidas eventualmente emergentes do clausulado do presente contrato, aplicar-se-ão as disposições vigentes na L.G.T.

CLÁUSULA DÉCIMA PRIMEIRA
Direito à Informação

Foram prestados todos os esclarecimentos e informações relativas aos aspectos mais relevantes do contrato, de forma escrita conforme consta do anexo I, que dele faz parte integrante, a que se referem os artigos do citado diploma legal, tendo o trabalhador ficado ciente de todos os direitos e obrigações decorrentes do presente contrato de trabalho.

CLÁUSULA DÉCIMA SEGUNDA
Disposições Finais

1. Ambas as partes se obrigam ao integral cumprimento do acordado no presente contrato, envolvendo a sua violação a imediata possibilidade de denúncia e consequente invocação de justa causa, independentemente de outras vias legalmente adequadas ao cabal ressarcimento dos direitos ou indemnizações emergentes.

2. Para resolução de quaisquer litígios emergentes do presente contrato, as partes convencionam o foro da comarca de Cacuaco com expressa renúncia a qualquer outro.

O presente contrato é feito em duplicado, ambos com valor de original, os quais vão ser assinados pelos contraentes, ficando um exemplar em poder de cada uma das partes.

Cacuaco, {DATA_ASSINATURA}`;

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
    } catch { notificar("Erro ao fazer upload do logo", "error"); }
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
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie a organização, sistema e segurança</p>
      </section>

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
                      <img src={org.logo_url} alt="Logo" className="h-full w-full object-contain" />
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
