import { useState, type FormEvent } from "react";
import { api, type PacienteResumo, ApiError } from "../api";
import { fmtCpf, fmtDate, idade, iniciais } from "../format";

export function Search({
  onOpen,
  onNovo,
}: {
  onOpen: (id: number) => void;
  onNovo: () => void;
}) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<PacienteResumo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscou, setBuscou] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      setErro("Digite ao menos 2 caracteres.");
      return;
    }
    setErro(null);
    setLoading(true);
    setBuscou(true);
    try {
      const r = await api.buscar(q.trim());
      setRes(r.pacientes);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao buscar.");
      setRes(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="page-head"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h1>Buscar pacientes</h1>
          <p>
            Histórico clínico unificado de qualquer paciente da rede
            integrada. Busque por CPF, CNS ou nome.
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
          onClick={onNovo}
        >
          + Cadastrar paciente
        </button>
      </div>

      <form className="search-bar" onSubmit={submit}>
        <input
          autoFocus
          placeholder="CPF, CNS ou nome completo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {erro && <div className="err">{erro}</div>}

      {loading && (
        <div className="center-msg">
          <span className="spinner" />
        </div>
      )}

      {!loading && res && res.length > 0 && (
        <div className="plist">
          {res.map((p) => (
            <div key={p.id} className="prow" onClick={() => onOpen(p.id)}>
              <div className="avatar">{iniciais(p.nome)}</div>
              <div style={{ flex: 1 }}>
                <div className="nm">{p.nome}</div>
                <div className="sub">
                  CPF {fmtCpf(p.cpf)} · CNS {p.cns} ·{" "}
                  {fmtDate(p.data_nascimento)} ({idade(p.data_nascimento)}) ·
                  Sexo {p.sexo}
                </div>
              </div>
              <span className="go">Abrir ficha →</span>
            </div>
          ))}
        </div>
      )}

      {!loading && buscou && res && res.length === 0 && !erro && (
        <div className="center-msg">
          Nenhum paciente encontrado para “{q}”.
        </div>
      )}
    </>
  );
}
