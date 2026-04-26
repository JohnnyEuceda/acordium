import { LogIn } from "lucide-react";
import { useState } from "react";

type Props = {
  onLogin: (email: string, password: string, register: boolean) => Promise<void>;
};

export function AuthPanel({ onLogin }: Props) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("acordium-demo");
  const [register, setRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onLogin(email, password, register);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <h1>Acordium</h1>
        <label>
          Correo
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={register} onChange={(event) => setRegister(event.target.checked)} />
          Crear cuenta
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={submit} disabled={busy}>
          <LogIn size={18} />
          {busy ? "Entrando" : "Continuar"}
        </button>
      </section>
    </main>
  );
}
