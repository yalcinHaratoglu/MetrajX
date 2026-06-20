import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthHero } from "../components/layout/AuthHero";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { authService, type InvitePreview } from "../services/authService";

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const load = async () => {
      if (!token) {
        setStatus("error");
        return;
      }
      try {
        const data = await authService.getInvite(token);
        setPreview(data);
        if (data.already_accepted) {
          setStatus("success");
        } else {
          setStatus("ready");
        }
      } catch {
        setStatus("error");
      }
    };
    void load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== passwordConfirm) {
      setError(t("auth.invite.passwordMismatch"));
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await authService.acceptInvite(token, password, passwordConfirm);
      setStatus("success");
    } catch {
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = preview?.role
    ? t(`settings.team.roles.${preview.role}`, preview.role)
    : "";

  return (
    <div className="auth-split">
      <AuthHero />
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <h1 className="auth-form-title">{t("auth.invite.title")}</h1>
            <p className="auth-form-subtitle">{t("auth.invite.subtitle")}</p>
          </div>

          {status === "loading" && <p>{t("auth.invite.loading")}</p>}

          {status === "error" && (
            <>
              <p className="text-error mb-4">{t("auth.invite.error")}</p>
              <Link to="/login" className="link-primary">
                {t("auth.login")}
              </Link>
            </>
          )}

          {status === "ready" && preview && (
            <>
              <div className="invite-preview surface-card mb-4">
                <p className="text-sm text-muted">{t("auth.invite.organization")}</p>
                <p className="font-medium">{preview.company_name}</p>
                <p className="mt-3 text-sm text-muted">{t("auth.email")}</p>
                <p className="font-medium">{preview.email}</p>
                {roleLabel && (
                  <>
                    <p className="mt-3 text-sm text-muted">{t("settings.team.role")}</p>
                    <p className="font-medium">{roleLabel}</p>
                  </>
                )}
              </div>

              <form onSubmit={handleSubmit} className="form-stack">
                <PasswordInput
                  label={t("auth.invite.password")}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <PasswordInput
                  label={t("auth.invite.passwordConfirm")}
                  name="password_confirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                />
                {error && <p className="text-error">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : t("auth.invite.submit")}
                </Button>
              </form>
            </>
          )}

          {status === "success" && (
            <>
              <p className="text-success mb-4">{t("auth.invite.success")}</p>
              <Link to="/login" className="link-primary">
                {t("auth.login")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
