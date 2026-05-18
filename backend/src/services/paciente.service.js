// Camada de serviço — lógica de negócio de pacientes.
// As rotas apenas delegam aqui; nenhuma query SQL fica nos controllers.

const { query } = require('../db');
const { derivarAlertas } = require('../utils/alertas');

const CAMPOS_BUSCA = 'id, cns, cpf, nome, data_nascimento, sexo';

/**
 * Detecta o modo de busca pelo formato da string.
 * @param {string} q
 * @returns {'cns' | 'cpf' | 'nome'}
 */
function classificarBusca(q) {
  const limpo = q.replace(/\D/g, '');
  if (/^\d+$/.test(q.trim()) && limpo.length === 15) return 'cns';
  if (/^\d+$/.test(q.trim()) && limpo.length === 11) return 'cpf';
  return 'nome';
}

/**
 * Busca pacientes por CNS, CPF ou nome parcial.
 * @param {string} q — termo de busca (mínimo 2 chars)
 * @returns {{ modo: string, total: number, pacientes: object[] }}
 */
async function buscarPaciente(q) {
  const modo = classificarBusca(q);
  let rows;

  if (modo === 'cns') {
    rows = await query(
      `SELECT ${CAMPOS_BUSCA} FROM paciente WHERE cns = $1`,
      [q.replace(/\D/g, '')]
    );
  } else if (modo === 'cpf') {
    rows = await query(
      `SELECT ${CAMPOS_BUSCA} FROM paciente WHERE cpf = $1`,
      [q.replace(/\D/g, '')]
    );
  } else {
    rows = await query(
      `SELECT ${CAMPOS_BUSCA} FROM paciente
        WHERE lower(nome) LIKE '%' || lower($1) || '%'
        ORDER BY nome LIMIT 20`,
      [q]
    );
  }

  return { modo, total: rows.length, pacientes: rows };
}

/**
 * Retorna a ficha completa do paciente + alertas clínicos derivados.
 * Registra o acesso em log_acesso (conformidade LGPD).
 * @param {number} pacienteId
 * @param {number} profissionalId
 * @returns {{ paciente: object, alertas: object[] }}
 */
async function obterFicha(pacienteId, profissionalId) {
  const rows = await query(`
    SELECT p.*, u.nome AS unidade_vinculada_nome
      FROM paciente p
 LEFT JOIN unidade u ON u.id = p.unidade_vinculada_id
     WHERE p.id = $1
  `, [pacienteId]);
  const paciente = rows[0];

  if (!paciente) return null;

  // Busca primeiro e último atendimento
  const statsRows = await query(`
    SELECT MIN(data_hora) as primeiro_atendimento, MAX(data_hora) as ultimo_atendimento
      FROM atendimento
     WHERE paciente_id = $1
  `, [pacienteId]);
  const stats = statsRows[0] || {};

  await registrarAuditoria(profissionalId, pacienteId, 'visualizou_ficha');

  return {
    paciente: {
      ...paciente,
      data_primeiro_atendimento: stats.primeiro_atendimento,
      data_ultimo_atendimento: stats.ultimo_atendimento
    },
    alertas: derivarAlertas(paciente),
  };
}

/**
 * Retorna a timeline clínica unificada de um paciente (todas as unidades).
 * Médico vê diagnóstico e observações; recepção vê apenas o resumo.
 * Registra o acesso em log_acesso (conformidade LGPD).
 * @param {number} pacienteId
 * @param {number} profissionalId
 * @param {'medico' | 'recepcao'} role
 * @returns {{ total: number, perfil: string, timeline: object[] }}
 */
async function obterTimeline(pacienteId, profissionalId, role) {
  const existe = await query('SELECT 1 FROM paciente WHERE id = $1', [pacienteId]);
  if (existe.length === 0) return null;

  const rows = await query(
    `SELECT a.id, a.tipo, a.data_hora, a.descricao,
            a.diagnostico, a.observacoes,
            a.sintomas, a.evolucao_medica,
            a.categoria_exame, a.resultados, a.laudos,
            a.medicamentos_prescritos, a.dosagem, a.frequencia, a.duracao,
            a.data_entrada, a.data_alta, a.setor,
            a.recomendacoes, a.retornos,
            u.nome AS unidade, u.tipo AS unidade_tipo, u.natureza,
            p.nome AS profissional
       FROM atendimento a
       JOIN unidade      u ON u.id = a.unidade_id
       JOIN profissional p ON p.id = a.profissional_id
      WHERE a.paciente_id = $1
      ORDER BY a.data_hora DESC`,
    [pacienteId]
  );

  const ehMedico = role === 'medico';
  const timeline = rows.map((r) => {
    const evento = {
      id: r.id,
      data_hora: r.data_hora,
      tipo: r.tipo,
      descricao: r.descricao,
      unidade: r.unidade,
      unidade_tipo: r.unidade_tipo,
      natureza: r.natureza,
      profissional: r.profissional,
    };
    if (ehMedico) {
      evento.diagnostico = r.diagnostico;
      evento.observacoes = r.observacoes;
      evento.sintomas = r.sintomas;
      evento.evolucao_medica = r.evolucao_medica;
      evento.categoria_exame = r.categoria_exame;
      evento.resultados = r.resultados;
      evento.laudos = r.laudos;
      evento.medicamentos_prescritos = r.medicamentos_prescritos;
      evento.dosagem = r.dosagem;
      evento.frequencia = r.frequencia;
      evento.duracao = r.duracao;
      evento.data_entrada = r.data_entrada;
      evento.data_alta = r.data_alta;
      evento.setor = r.setor;
      evento.recomendacoes = r.recomendacoes;
      evento.retornos = r.retornos;
    }
    return evento;
  });

  await registrarAuditoria(profissionalId, pacienteId, 'visualizou_timeline');

  return { total: timeline.length, perfil: role, timeline };
}

/**
 * Grava um registro de auditoria LGPD em log_acesso.
 * @param {number} profissionalId
 * @param {number} pacienteId
 * @param {string} acao
 */
async function registrarAuditoria(profissionalId, pacienteId, acao) {
  await query(
    'INSERT INTO log_acesso (profissional_id, paciente_id, acao) VALUES ($1, $2, $3)',
    [profissionalId, pacienteId, acao]
  );
}

/**
 * Cadastra um novo paciente. Valida obrigatórios e unicidade
 * (cns, cpf, numero_prontuario). Registra auditoria.
 * @param {object} dados — campos do paciente
 * @param {number} profissionalId — quem está cadastrando
 * @returns {{ id: number } | { erro: string, status: number }}
 */
async function criarPaciente(dados, profissionalId) {
  const nome = (dados.nome || '').trim();
  const cns = (dados.cns || '').replace(/\D/g, '');
  const cpf = dados.cpf ? dados.cpf.replace(/\D/g, '') : null;
  const dataNascimento = dados.data_nascimento || null;
  const sexo = dados.sexo || null;

  if (!nome) return { erro: 'Nome é obrigatório.', status: 400 };
  if (cns.length !== 15)
    return { erro: 'CNS é obrigatório e deve ter 15 dígitos.', status: 400 };
  if (cpf && cpf.length !== 11)
    return { erro: 'CPF deve ter 11 dígitos.', status: 400 };
  if (!dataNascimento)
    return { erro: 'Data de nascimento é obrigatória.', status: 400 };
  if (isNaN(new Date(dataNascimento).getTime()))
    return { erro: 'Data de nascimento inválida.', status: 400 };
  if (sexo && !['M', 'F', 'O'].includes(sexo))
    return { erro: 'Sexo deve ser M, F ou O.', status: 400 };

  // Checagem amigável de duplicidade antes de inserir.
  const dup = await query(
    `SELECT 1 FROM paciente WHERE cns = $1 OR (cpf IS NOT NULL AND cpf = $2) LIMIT 1`,
    [cns, cpf]
  );
  if (dup.length > 0)
    return {
      erro: 'Já existe um paciente com este CNS ou CPF.',
      status: 409,
    };

  const v = (x) => {
    if (x === undefined || x === null) return null;
    const s = String(x).trim();
    return s === '' ? null : s;
  };

  try {
    const rows = await query(
      `INSERT INTO paciente
        (cns, cpf, rg, certidao, rne_rni,
         nome, nome_social, genero, data_nascimento, sexo,
         nacionalidade, naturalidade, nome_mae, nome_pai, responsavel_legal,
         estado_civil, escolaridade, tipo_sanguineo, cor_raca,
         telefone_principal, telefone_secundario, email, contato_emergencia,
         cep, rua, numero, bairro, cidade, estado,
         alergias, doencas_cronicas, deficiencias, medicamentos_continuos,
         historico_cirurgico, convenio_medico,
         numero_prontuario, unidade_vinculada_id, status_paciente)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
         $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
       RETURNING id`,
      [
        cns, cpf, v(dados.rg), v(dados.certidao), v(dados.rne_rni),
        nome, v(dados.nome_social), v(dados.genero), dataNascimento, sexo,
        v(dados.nacionalidade) || 'Brasileira', v(dados.naturalidade),
        v(dados.nome_mae), v(dados.nome_pai), v(dados.responsavel_legal),
        v(dados.estado_civil), v(dados.escolaridade), v(dados.tipo_sanguineo),
        v(dados.cor_raca), v(dados.telefone_principal),
        v(dados.telefone_secundario), v(dados.email),
        v(dados.contato_emergencia), v(dados.cep), v(dados.rua),
        v(dados.numero), v(dados.bairro), v(dados.cidade), v(dados.estado),
        v(dados.alergias), v(dados.doencas_cronicas), v(dados.deficiencias),
        v(dados.medicamentos_continuos), v(dados.historico_cirurgico),
        v(dados.convenio_medico), v(dados.numero_prontuario),
        dados.unidade_vinculada_id ? Number(dados.unidade_vinculada_id) : null,
        v(dados.status_paciente) || 'Ativo',
      ]
    );

    const novoId = rows[0].id;
    await registrarAuditoria(profissionalId, novoId, 'cadastrou_paciente');
    return { id: novoId };
  } catch (err) {
    if (err && err.code === '23505') {
      return {
        erro: 'CNS, CPF ou nº de prontuário já cadastrado.',
        status: 409,
      };
    }
    throw err;
  }
}

module.exports = {
  buscarPaciente,
  obterFicha,
  obterTimeline,
  criarPaciente,
};
