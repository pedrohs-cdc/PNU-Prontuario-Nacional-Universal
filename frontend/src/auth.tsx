import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, type Profissional } from "./api";

interface AuthCtx {
  prof: Profissional | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [prof, setProf] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir, se já houver token salvo, valida via /auth/me.
  useEffect(() => {
    const tk = getToken();
    if (!tk) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setProf(r.profissional))
      .catch(() => {
        setToken(null);
        setProf(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, senha: string) {
    const r = await api.login(email, senha);
    setToken(r.token);
    setProf(r.profissional);
  }

  function logout() {
    setToken(null);
    setProf(null);
  }

  return (
    <Ctx.Provider value={{ prof, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
