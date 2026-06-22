import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthHero } from "../components/layout/AuthHero";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <AuthHero />
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <h1 className="auth-form-title">{t("auth.login")}</h1>
            <p className="auth-form-subtitle">{t("auth.loginSubtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="form-stack">
            <Input
              label={t("auth.email")}
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label={t("auth.password")}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-error">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : t("auth.login")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="link-primary">
              {t("auth.register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
