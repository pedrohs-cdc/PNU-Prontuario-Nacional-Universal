export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function idade(nascimento: string | null | undefined): string {
  if (!nascimento) return "";
  const d = new Date(nascimento);
  if (isNaN(d.getTime())) return "";
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) anos--;
  return `${anos} anos`;
}

export function fmtCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const s = cpf.replace(/\D/g, "");
  if (s.length !== 11) return cpf;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

const ROLE_LABEL: Record<string, string> = {
  medico: "Médico(a)",
  recepcao: "Recepção",
  admin: "Administrador",
};
export function roleLabel(r: string): string {
  return ROLE_LABEL[r] || r;
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
