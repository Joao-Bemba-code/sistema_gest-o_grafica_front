// Ficha PDF de um bem patrimonial (módulo Património).
// Segue o mesmo estilo monocromático de marca dos restantes documentos.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatKz,
  formatarData,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  rodapeMarca,
  TEMA_TABELA_MARCA,
} from "./pdfEstilo";

const ESTADOS_LABEL = {
  ativo: "Em uso",
  manutencao: "Em manutenção",
  avariado: "Avariado",
  abate: "Abatido",
};

export async function gerarFichaBemPDF(bem, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const codigo = bem?.codigo || "—";

  const { yInicio, logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Ficha do Bem",
    empresa: org,
    direitos: [`Código: ${codigo}`, `Data: ${formatarData(new Date().toISOString())}`],
  });
  desenharMarcaDeAgua(doc, logo);

  const linhas = [
    ["Código", codigo],
    ["Nome", bem?.nome || "—"],
    ["Categoria", bem?.categoria || "—"],
    ["Família", bem?.familia || "—"],
    ["Subfamília", bem?.subfamilia || "—"],
    ["Grupo", bem?.grupo || "—"],
    ["Tipo", bem?.tipo || "—"],
    ["Valor de Aquisição", bem?.valor_aquisicao != null ? formatKz(bem.valor_aquisicao) : "—"],
    ["Data de Aquisição", formatarData(bem?.data_aquisicao)],
    ["Estado", ESTADOS_LABEL[bem?.estado] || bem?.estado || "—"],
    ["Localização", bem?.localizacao || "—"],
    ["Observações", bem?.observacoes || "—"],
  ];

  autoTable(doc, {
    startY: yInicio,
    head: [["Campo", "Valor"]],
    body: linhas,
    ...TEMA_TABELA_MARCA,
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 127 },
    },
  });

  rodapeMarca(doc);
  doc.save(`Ficha_Bem_${String(codigo).replace(/[^\w-]+/g, "_")}.pdf`);
}
