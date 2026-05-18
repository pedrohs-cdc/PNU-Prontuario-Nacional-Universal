// Cliente HTTP do PNU. Em dev o Vite faz proxy de /api -> :3001;
// em produção o backend serve este build e responde /api no mesmo host.

const TOKEN_KEY = "pnu.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  const tk = getToken();
  if (tk) headers.set("Authorization", `Bearer ${tk}`);

  const res = await fetch(`/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.erro) || `Erro ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

// ── Tipos espelhando o backend ────────────────────────────────

export type Role = "medico" | "recepcao" | "admin";

export interface Profissional {
  id: number;
  nome: string;
  role: Role;
  unidade_id: number;
}

export interface PacienteResumo {
  id: number;
  cns: string;
  cpf: string | null;
  nome: string;
  data_nascimento: string;
  sexo: "M" | "F" | "O";
}

export interface BuscaResp {
  modo: "cns" | "cpf" | "nome";
  total: number;
  pacientes: PacienteResumo[];
}

export interface Alerta {
  tipo: string;
  descricao: string;
  severidade: "critico" | "atencao";
}

export interface PacienteFull {
  id: number;
  nome: string;
  nome_social: string | null;
  cns: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string;
  sexo: "M" | "F" | "O";
  genero: string | null;
  nacionalidade: string | null;
  naturalidade: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  tipo_sanguineo: string | null;
  cor_raca: string | null;
  telefone_principal: string | null;
  telefone_secundario: string | null;
  email: string | null;
  contato_emergencia: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  alergias: string | null;
  doencas_cronicas: string | null;
  deficiencias: string | null;
  medicamentos_continuos: string | null;
  historico_cirurgico: string | null;
  convenio_medico: string | null;
  numero_prontuario: string | null;
  unidade_vinculada_nome: string | null;
  status_paciente: string | null;
  data_primeiro_atendimento: string | null;
  data_ultimo_atendimento: string | null;
}

export interface FichaResp {
  paciente: PacienteFull;
  alertas: Alerta[];
}

export interface EventoTimeline {
  id: number;
  data_hora: string;
  tipo: string;
  descricao: string;
  unidade: string;
  unidade_tipo: string;
  natureza: string;
  profissional: string;
  diagnostico?: string | null;
  observacoes?: string | null;
  sintomas?: string | null;
  evolucao_medica?: string | null;
  categoria_exame?: string | null;
  resultados?: string | null;
  laudos?: string | null;
  medicamentos_prescritos?: string | null;
  dosagem?: string | null;
  frequencia?: string | null;
  duracao?: string | null;
  data_entrada?: string | null;
  data_alta?: string | null;
  setor?: string | null;
  recomendacoes?: string | null;
  retornos?: string | null;
}

export interface TimelineResp {
  total: number;
  perfil: Role;
  timeline: EventoTimeline[];
}

export interface LogItem {
  acao: string;
  timestamp: string;
  profissional: string;
  role: string;
  unidade: string;
}

export interface LogResp {
  total: number;
  log: LogItem[];
}

export const TIPOS_ATENDIMENTO = [
  "Consulta",
  "Exame",
  "Medicação",
  "Internação",
  "Observação",
] as const;

export const api = {
  login: (email: string, senha: string) =>
    req<{ token: string; profissional: Profissional }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),
  me: () => req<{ profissional: Profissional }>("/auth/me"),
  buscar: (q: string) =>
    req<BuscaResp>(`/pacientes/busca?q=${encodeURIComponent(q)}`),
  ficha: (id: number) => req<FichaResp>(`/pacientes/${id}`),
  timeline: (id: number) => req<TimelineResp>(`/pacientes/${id}/timeline`),
  log: (id: number) => req<LogResp>(`/pacientes/${id}/log`),
  novoAtendimento: (id: number, body: Record<string, unknown>) =>
    req<{ ok: true; atendimento_id: number }>(
      `/pacientes/${id}/atendimentos`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  criarPaciente: (body: Record<string, unknown>) =>
    req<{ ok: true; id: number }>(`/pacientes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
