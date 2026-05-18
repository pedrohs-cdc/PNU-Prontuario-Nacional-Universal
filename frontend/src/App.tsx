import { useState } from "react";
import { useAuth } from "./auth";
import { Login } from "./screens/Login";
import { Search } from "./screens/Search";
import { Patient } from "./screens/Patient";
import { NovoPaciente } from "./screens/NovoPaciente";
import { iniciais, roleLabel } from "./format";

type View =
  | { tela: "busca" }
  | { tela: "paciente"; id: number }
  | { tela: "novo" };

export function App() {
  const { prof, loading, logout } = useAuth();
  const [view, setView] = useState<View>({ tela: "busca" });

  if (loading)
    return (
      <div className="login-wrap">
        <span className="spinner" />
      </div>
    );

  if (!prof) return <Login />;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PNU</div>
          </div>
        </div>
        <div className="spacer" />
        <div className="user-chip">
          <div className="user-meta">
            <div className="n">{prof.nome}</div>
            <div className="r">{roleLabel(prof.role)}</div>
          </div>
          <div className="avatar">{iniciais(prof.nome)}</div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ marginLeft: 8 }}
          onClick={() => {
            setView({ tela: "busca" });
            logout();
          }}
        >
          Sair
        </button>
      </header>

      <main className="content">
        {view.tela === "busca" && (
          <Search
            onOpen={(id) => setView({ tela: "paciente", id })}
            onNovo={() => setView({ tela: "novo" })}
          />
        )}
        {view.tela === "paciente" && (
          <Patient
            id={view.id}
            prof={prof}
            onBack={() => setView({ tela: "busca" })}
          />
        )}
        {view.tela === "novo" && (
          <NovoPaciente
            onCriado={(id) => setView({ tela: "paciente", id })}
            onCancel={() => setView({ tela: "busca" })}
          />
        )}
      </main>
    </>
  );
}
