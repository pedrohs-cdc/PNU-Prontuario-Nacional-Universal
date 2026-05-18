# PNU — Prontuário Unificado

Protótipo acadêmico de prontuário eletrônico integrado para uma rede
municipal de saúde (cenário: Franca/SP). Monorepo com backend e
interface conectados, rodando como um único site.

> **Dados 100% sintéticos.** Nenhum dado real de paciente. Nomes de
> instituições = contexto local; projeto não afiliado a nenhuma delas.

## O que funciona

Sistema completo e funcional ponta a ponta:

- Login real (JWT) por e-mail e senha
- Busca de paciente por CPF, CNS ou nome
- Ficha completa do paciente + alertas clínicos automáticos
- Histórico (timeline) unificado cruzando todas as unidades
- Cadastrar novo paciente (formulário completo, médico ou recepção)
- Registrar novo atendimento (perfil médico)
- Log de auditoria de acessos (conformidade LGPD)

## Banco de dados — não precisa instalar nada

O backend usa **PGlite** (PostgreSQL embutido). Na primeira execução
ele cria o banco sozinho numa pasta local e popula com os dados
sintéticos. Não é preciso instalar PostgreSQL.

## Como rodar

Pré-requisito: apenas Node.js >= 18.

```bash
# 1. Instalar dependências
npm run install:all

# 2. Criar usuários de teste (gera o banco automaticamente)
npm run set-passwords

# 3a. Desenvolvimento (backend 3001 + frontend 5173 juntos)
npm run dev
#    abra http://localhost:5173

# 3b. OU produção (um site só, uma porta só)
npm run serve
#    abra http://localhost:3001
```

## Acesso de teste

Senha para todos: `pnu123`

| Perfil   | E-mail                       |
| -------- | ---------------------------- |
| Médico   | `helena.martins@pnu.local`   |
| Médico   | `rafael.antunes@pnu.local`   |
| Recepção | `patricia.lima@pnu.local`    |

(Perfil médico vê diagnósticos, pode registrar atendimento e ver
auditoria. Recepção vê apenas o resumo.)

## Estrutura

```
PNU/
  backend/    API Node.js + Express + PGlite (Fases 1–6, testadas)
  frontend/   Interface React + Vite + TypeScript, conectada à API
  db/         schema.sql + seed.sql (dados sintéticos)
  docs/       documento do projeto
```

## Como front e back se conectam

- Dev: o Vite faz proxy de `/api` e `/health` para o backend (3001).
- Produção: `npm run build` gera `frontend/dist`, e o backend serve
  esse build + responde `/api` no mesmo domínio. Um site só.
- Toda chamada passa por `frontend/src/api.ts`, que anexa o token JWT.

## Escopo

A interface cobre exatamente o que o backend implementa. O cadastro
de paciente (formulário completo, todos os campos do prontuário) foi
adicionado com rota própria no backend e pode ser feito tanto pelo
perfil médico quanto pelo de recepção, pelo botão "Cadastrar paciente"
na tela de busca. Telas como agenda e medicações não existem porque
não há backend para elas neste protótipo — deixadas de fora de
propósito, para o sistema não prometer o que não entrega.
