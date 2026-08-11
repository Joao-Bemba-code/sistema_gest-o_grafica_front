import api from "./api";

export async function baixarBackup() {
  const res = await api.get("/backup/zip", { responseType: "blob", timeout: 120000 });
  const disposicao = res.headers["content-disposition"] || "";
  const match = disposicao.match(/filename="?([^";]+)"?/i);
  const nome = match ? match[1] : `sigraf-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return nome;
}
