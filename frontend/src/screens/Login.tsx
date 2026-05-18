import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErro("E-mail ou senha incorretos.");
      } else if (err instanceof ApiError) {
        setErro(err.message);
      } else {
        setErro(
          "Não foi possível conectar ao servidor. O backend está rodando?"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PNU</div>
            <div className="brand-sub">Prontuário Nacional Universal</div>
          </div>
        </div>

        {erro && <div className="err">{erro}</div>}

        <div className="field">
          <label htmlFor="email">E-mail do profissional</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@pnu.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || !email || !senha}
        >
          {loading ? "Acessando…" : "Acessar prontuário"}
        </button>

        <div className="hint">
          Acesso de teste (dados sintéticos):
          <br />
          <code>helena.martins@pnu.local</code> · senha <code>pnu123</code>
        </div>
      </form>
    </div>
  );
}
