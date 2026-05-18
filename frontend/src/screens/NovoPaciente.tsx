import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";

type F = Record<string, string>;

const SECOES: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: "Documentação",
    campos: [
      { k: "cns", label: "CNS (15 dígitos) *", req: true },
      { k: "cpf", label: "CPF (11 dígitos)" },
      { k: "rg", label: "RG" },
      { k: "certidao", label: "Certidão" },
      { k: "rne_rni", label: "RNE / RNI" },
    ],
  },
  {
    titulo: "Dados pessoais",
    campos: [
      { k: "nome", label: "Nome completo *", req: true, full: true },
      { k: "nome_social", label: "Nome social" },
      { k: "genero", label: "Gênero" },
      { k: "data_nascimento", label: "Data de nascimento *", req: true, type: "date" },
      { k: "sexo", label: "Sexo *", req: true, type: "select", opts: ["M", "F", "O"] },
      { k: "nacionalidade", label: "Nacionalidade" },
      { k: "naturalidade", label: "Naturalidade" },
      { k: "nome_mae", label: "Nome da mãe" },
      { k: "nome_pai", label: "Nome do pai" },
      { k: "responsavel_legal", label: "Responsável legal" },
    ],
  },
  {
    titulo: "Dados civis e físicos",
    campos: [
      { k: "estado_civil", label: "Estado civil" },
      { k: "escolaridade", label: "Escolaridade" },
      { k: "tipo_sanguineo", label: "Tipo sanguíneo" },
      { k: "cor_raca", label: "Cor / raça" },
    ],
  },
  {
    titulo: "Contatos",
    campos: [
      { k: "telefone_principal", label: "Telefone principal" },
      { k: "telefone_secundario", label: "Telefone secundário" },
      { k: "email", label: "E-mail", type: "email" },
      { k: "contato_emergencia", label: "Contato de emergência" },
    ],
  },
  {
    titulo: "Endereço",
    campos: [
      { k: "cep", label: "CEP" },
      { k: "rua", label: "Rua" },
      { k: "numero", label: "Número" },
      { k: "bairro", label: "Bairro" },
      { k: "cidade", label: "Cidade" },
      { k: "estado", label: "UF (2 letras)" },
    ],
  },
  {
    titulo: "Informações clínicas",
    campos: [
      { k: "alergias", label: "Alergias (gera alertas)", area: true, full: true },
      { k: "doencas_cronicas", label: "Doenças crônicas (gera alertas)", area: true, full: true },
      { k: "deficiencias", label: "Deficiências", area: true, full: true },
      { k: "medicamentos_continuos", label: "Medicamentos contínuos", area: true, full: true },
      { k: "historico_cirurgico", label: "Histórico cirúrgico", area: true, full: true },
      { k: "convenio_medico", label: "Convênio médico" },
    ],
  },
  {
    titulo: "Vínculo na rede",
    campos: [
      { k: "numero_prontuario", label: "Nº prontuário" },
      { k: "status_paciente", label: "Status" },
    ],
  },
];

interface Campo {
  k: string;
  label: string;
  req?: boolean;
  full?: boolean;
  area?: boolean;
  type?: "date" | "email" | "select";
  opts?: string[];
}

export function NovoPaciente({
  onCriado,
  onCancel,
}: {
  onCriado: (id: number) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<F>({ nacionalidade: "Brasileira", status_paciente: "Ativo" });
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: string, val: string) {
    setF((p) => ({ ...p, [k]: val }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!f.nome?.trim()) return setErro("Nome é obrigatório.");
    if ((f.cns || "").replace(/\D/g, "").length !== 15)
      return setErro("CNS é obrigatório e deve ter 15 dígitos.");
    if (!f.data_nascimento) return setErro("Data de nascimento é obrigatória.");
    if (!f.sexo) return setErro("Sexo é obrigatório.");

    setLoading(true);
    try {
      const r = await api.criarPaciente(f);
      onCriado(r.id);
    } catch (err) {
      setErro(
        err instanceof ApiError ? err.message : "Erro ao cadastrar paciente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="back-link" onClick={onCancel}>
        ← Cancelar e voltar
      </button>
      <div className="page-head">
        <h1>Cadastrar novo paciente</h1>
        <p>Campos com * são obrigatórios. Os demais podem ficar em branco.</p>
      </div>

      {erro && <div className="err">{erro}</div>}

      <form onSubmit={submit}>
        {SECOES.map((sec) => (
          <div key={sec.titulo}>
            <div className="section-title">{sec.titulo}</div>
            <div className="card card-pad">
              <div className="form-grid">
                {sec.campos.map((c) => (
                  <div key={c.k} className={c.full ? "full" : undefined}>
                    <label>{c.label}</label>
                    {c.type === "select" ? (
                      <select
                        value={f[c.k] || ""}
                        onChange={(e) => set(c.k, e.target.value)}
                      >
                        <option value="">—</option>
                        {c.opts!.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : c.area ? (
                      <textarea
                        value={f[c.k] || ""}
                        onChange={(e) => set(c.k, e.target.value)}
                        placeholder="Separe itens por vírgula"
                      />
                    ) : (
                      <input
                        type={c.type || "text"}
                        value={f[c.k] || ""}
                        onChange={(e) => set(c.k, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Cadastrar paciente"}
          </button>
        </div>
      </form>
    </>
  );
}
