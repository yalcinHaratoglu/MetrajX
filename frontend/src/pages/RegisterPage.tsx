import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    company_name: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await register(form);
      setMessage(t("auth.registerSuccess"));
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <Card variant="narrow">
        <div className="auth-header">
          <h1 className="auth-title">{t("auth.register")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <Input label={t("auth.firstName")} name="first_name" value={form.first_name} onChange={handleChange} required />
          <Input label={t("auth.lastName")} name="last_name" value={form.last_name} onChange={handleChange} required />
          <Input label={t("auth.email")} type="email" name="email" value={form.email} onChange={handleChange} required />
          <Input label={t("auth.password")} type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          <Input label={t("auth.companyName")} name="company_name" value={form.company_name} onChange={handleChange} />
          {message && <p className="text-success">{message}</p>}
          {error && <p className="text-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? t("common.loading") : t("auth.register")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="link-primary">
            {t("auth.login")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
