import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  TIPOS_ATENDIMENTO,
  type FichaResp,
  type TimelineResp,
  type LogResp,
  type Profissional,
} from "../api";
import { fmtCpf, fmtDate, fmtDateTime, idade, iniciais } from "../format";

type Tab = "ficha" | "timeline" | "novo" | "log";

export function Patient({
  id,
  prof,
  onBack,
}: {
  id: number;
  prof: Profissional;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("ficha");
  const [ficha, setFicha] = useState<FichaResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ehMedico = prof.role === "medico";

  useEffect(() => {
    setErro(null);
    api
      .ficha(id)
      .then(setFicha)
      .catch((e) =>
        setErro(e instanceof ApiError ? e.message : "Erro ao carregar ficha.")
      );
  }, [id]);

  if (erro) return <div className="err">{erro}</div>;
  if (!ficha)
    return (
      <div className="center-msg">
        <span className="spinner" />
      </div>
    );

  const p = ficha.paciente;

  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Voltar à busca
      </button>

      <div className="patient-hero">
        <div className="avatar">{iniciais(p.nome)}</div>
        <div>
          <h1>{p.nome}</h1>
          <div className="meta">
            CPF {fmtCpf(p.cpf)} · CNS {p.cns} · {fmtDate(p.data_nascimento)} (
            {idade(p.data_nascimento)}) · Sexo {p.sexo} ·{" "}
            {p.tipo_sanguineo || "tipo sanguíneo n/d"}
          </div>
        </div>
      </div>

      {ficha.alertas.length > 0 && (
        <div className="alerts">
          {ficha.alertas.map((a, i) => (
            <span key={i} className={`alert-chip ${a.severidade}`}>
              {a.tipo}: {a.descricao}
            </span>
          ))}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${tab === "ficha" ? "active" : ""}`}
          onClick={() => setTab("ficha")}
        >
          Ficha
        </button>
        <button
          className={`tab ${tab === "timeline" ? "active" : ""}`}
          onClick={() => setTab("timeline")}
        >
          Histórico
        </button>
        {ehMedico && (
          <button
            className={`tab ${tab === "novo" ? "active" : ""}`}
            onClick={() => setTab("novo")}
          >
            Novo atendimento
          </button>
        )}
        {ehMedico && (
          <button
            className={`tab ${tab === "log" ? "active" : ""}`}
            onClick={() => setTab("log")}
          >
            Auditoria
          </button>
        )}
      </div>

      {tab === "ficha" && <Ficha f={ficha} />}
      {tab === "timeline" && <Timeline id={id} />}
      {tab === "novo" && ehMedico && (
        <NovoAtendimento id={id} onCriado={() => setTab("timeline")} />
      )}
      {tab === "log" && ehMedico && <Log id={id} />}
    </>
  );
}

function Cell({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="info-cell">
      <div className="k">{k}</div>
      <div className="v">{v || "—"}</div>
    </div>
  );
}

function Ficha({ f }: { f: FichaResp }) {
  const p = f.paciente;
  return (
    <>
      <div className="section-title">Identificação</div>
      <div className="info-grid">
        <Cell k="Nome social" v={p.nome_social} />
        <Cell k="Gênero" v={p.genero} />
        <Cell k="Nome da mãe" v={p.nome_mae} />
        <Cell k="Nome do pai" v={p.nome_pai} />
        <Cell k="Estado civil" v={p.estado_civil} />
        <Cell k="Escolaridade" v={p.escolaridade} />
        <Cell k="Cor / raça" v={p.cor_raca} />
        <Cell k="Naturalidade" v={p.naturalidade} />
      </div>

      <div className="section-title">Contato e endereço</div>
      <div className="info-grid">
        <Cell k="Telefone" v={p.telefone_principal} />
        <Cell k="Telefone 2" v={p.telefone_secundario} />
        <Cell k="E-mail" v={p.email} />
        <Cell k="Contato emergência" v={p.contato_emergencia} />
        <Cell
          k="Endereço"
          v={
            [p.rua, p.numero, p.bairro].filter(Boolean).join(", ") || null
          }
        />
        <Cell
          k="Cidade / UF"
          v={[p.cidade, p.estado].filter(Boolean).join(" / ") || null}
        />
        <Cell k="CEP" v={p.cep} />
      </div>

      <div className="section-title">Informações clínicas</div>
      <div className="info-grid">
        <Cell k="Alergias" v={p.alergias} />
        <Cell k="Doenças crônicas" v={p.doencas_cronicas} />
        <Cell k="Medicamentos contínuos" v={p.medicamentos_continuos} />
        <Cell k="Deficiências" v={p.deficiencias} />
        <Cell k="Histórico cirúrgico" v={p.historico_cirurgico} />
        <Cell k="Convênio" v={p.convenio_medico} />
      </div>

      <div className="section-title">Vínculo na rede</div>
      <div className="info-grid">
        <Cell k="Nº prontuário" v={p.numero_prontuario} />
        <Cell k="Unidade vinculada" v={p.unidade_vinculada_nome} />
        <Cell k="Status" v={p.status_paciente} />
        <Cell
          k="1º atendimento"
          v={fmtDate(p.data_primeiro_atendimento)}
        />
        <Cell
          k="Último atendimento"
          v={fmtDate(p.data_ultimo_atendimento)}
        />
      </div>
    </>
  );
}

function Timeline({ id }: { id: number }) {
  const [data, setData] = useState<TimelineResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .timeline(id)
      .then(setData)
      .catch((e) =>
        setErro(e instanceof ApiError ? e.message : "Erro ao carregar.")
      );
  }, [id]);

  if (erro) return <div className="err">{erro}</div>;
  if (!data)
    return (
      <div className="center-msg">
        <span className="spinner" />
      </div>
    );
  if (data.timeline.length === 0)
    return (
      <div className="center-msg">
        Nenhum atendimento registrado para este paciente.
      </div>
    );

  return (
    <div className="tl">
      {data.timeline.map((ev) => (
        <div key={ev.id} className="tl-item">
          <div className="tl-dot" />
          <div className="tl-body">
            <div className="tl-top">
              <div>
                <span className="tl-tipo">{ev.tipo}</span>
                <span className="badge">{ev.unidade_tipo}</span>
              </div>
              <span className="tl-when">{fmtDateTime(ev.data_hora)}</span>
            </div>
            <div className="tl-unit">
              {ev.unidade} · {ev.natureza} · {ev.profissional}
            </div>
            <div className="tl-desc">{ev.descricao}</div>
            {(ev.diagnostico ||
              ev.observacoes ||
              ev.sintomas ||
              ev.medicamentos_prescritos ||
              ev.resultados ||
              ev.recomendacoes) && (
              <div className="tl-extra">
                {ev.sintomas && (
                  <span>
                    <b>Sintomas:</b> {ev.sintomas}
                  </span>
                )}
                {ev.diagnostico && (
                  <span>
                    <b>Diagnóstico:</b> {ev.diagnostico}
                  </span>
                )}
                {ev.evolucao_medica && (
                  <span>
                    <b>Evolução:</b> {ev.evolucao_medica}
                  </span>
                )}
                {ev.medicamentos_prescritos && (
                  <span>
                    <b>Medicação:</b> {ev.medicamentos_prescritos}
                    {ev.dosagem ? ` · ${ev.dosagem}` : ""}
                    {ev.frequencia ? ` · ${ev.frequencia}` : ""}
                    {ev.duracao ? ` · ${ev.duracao}` : ""}
                  </span>
                )}
                {ev.categoria_exame && (
                  <span>
                    <b>Exame:</b> {ev.categoria_exame}
                  </span>
                )}
                {ev.resultados && (
                  <span>
                    <b>Resultados:</b> {ev.resultados}
                  </span>
                )}
                {ev.laudos && (
                  <span>
                    <b>Laudo:</b> {ev.laudos}
                  </span>
                )}
                {ev.observacoes && (
                  <span>
                    <b>Observações:</b> {ev.observacoes}
                  </span>
                )}
                {ev.recomendacoes && (
                  <span>
                    <b>Recomendações:</b> {ev.recomendacoes}
                  </span>
                )}
                {ev.retornos && (
                  <span>
                    <b>Retorno:</b> {ev.retornos}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NovoAtendimento({
  id,
  onCriado,
}: {
  id: number;
  onCriado: () => void;
}) {
  const [tipo, setTipo] = useState<string>("Consulta");
  const [descricao, setDescricao] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) {
      setErro("A descrição é obrigatória.");
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      await api.novoAtendimento(id, {
        tipo,
        descricao: descricao.trim(),
        diagnostico: diagnostico.trim() || undefined,
        sintomas: sintomas.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      setOk(true);
      setTimeout(onCriado, 900);
    } catch (err) {
      setErro(
        err instanceof ApiError ? err.message : "Erro ao salvar atendimento."
      );
    } finally {
      setLoading(false);
    }
  }

  if (ok)
    return (
      <div className="ok-msg">
        Atendimento registrado com sucesso. Abrindo o histórico…
      </div>
    );

  return (
    <form className="card card-pad" onSubmit={submit}>
      {erro && <div className="err">{erro}</div>}
      <div className="form-grid">
        <div>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_ATENDIMENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Diagnóstico</label>
          <input
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="full">
          <label>Descrição *</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Resumo do atendimento"
          />
        </div>
        <div className="full">
          <label>Sintomas</label>
          <textarea
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="full">
          <label>Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Salvando…" : "Registrar atendimento"}
        </button>
      </div>
    </form>
  );
}

function Log({ id }: { id: number }) {
  const [data, setData] = useState<LogResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .log(id)
      .then(setData)
      .catch((e) =>
        setErro(e instanceof ApiError ? e.message : "Erro ao carregar.")
      );
  }, [id]);

  if (erro) return <div className="err">{erro}</div>;
  if (!data)
    return (
      <div className="center-msg">
        <span className="spinner" />
      </div>
    );

  return (
    <div className="card">
      {data.log.length === 0 && (
        <div className="center-msg">Sem registros de acesso.</div>
      )}
      {data.log.map((l, i) => (
        <div key={i} className="log-row">
          <div>
            <b>{l.profissional}</b> ({l.role}) — {l.acao.replace(/_/g, " ")}
            <div className="muted" style={{ fontSize: 12.5 }}>
              {l.unidade}
            </div>
          </div>
          <span className="when">{fmtDateTime(l.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}
