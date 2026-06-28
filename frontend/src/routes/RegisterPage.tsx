import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import FaultyTerminal from "../components/background/FaultyTerminal";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import type { ApiError } from "../types/api";

/** Registration form. Creates an account, stores tokens, lands on the dashboard. */
export default function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;

  const fieldError = (name: string) => error?.fieldErrors?.[name]?.[0];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(email, name, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  const generalError =
    error && !error.fieldErrors ? error.message : error?.fieldErrors?.non_field_errors?.[0];

  return (
    <main className="auth">
      <div className="lp-bg" aria-hidden="true">
        <FaultyTerminal brightness={0.16} mouseReact={false} pageLoadAnimation={false} />
      </div>
      <div className="lp-bg__gradient" aria-hidden="true" />
      <div className="lp-bg__dim" aria-hidden="true" />

      <div className="auth__card">
        <div className="auth__head">
          <Link to="/" className="brand" aria-label="PatchPath home">
            <span className="brand__mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="brand__word">
              Patch<span>Path</span>
            </span>
          </Link>
          <h1 className="auth__title">Create your account</h1>
          <p className="auth__sub">Start turning failed deploys into fixes.</p>
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          {generalError ? (
            <p className="form__error" role="alert">
              <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
              {generalError}
            </p>
          ) : null}

          <Input
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError("name")}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError("email")}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError("password")}
          />

          <Button type="submit" loading={submitting} dot className="btn--block">
            Create account
          </Button>
        </form>

        <p className="form__foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
