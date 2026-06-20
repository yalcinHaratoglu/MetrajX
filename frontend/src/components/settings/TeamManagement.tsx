import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { settingsService, type TeamMember } from "../../services/settingsService";
import { siteService, type Site } from "../../services/siteService";
import { useAuth } from "../../hooks/useAuth";

const columnHelper = createColumnHelper<TeamMember>();

export function TeamManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [invite, setInvite] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "site_manager",
    site_ids: [] as number[],
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = user?.role === "owner";

  const loadTeam = useCallback(async () => {
    const data = await settingsService.getTeam();
    setMembers(data);
  }, []);

  useEffect(() => {
    void loadTeam();
    void siteService.list().then(setSites).catch(() => undefined);
  }, [loadTeam]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("email", { header: t("auth.email") }),
      columnHelper.accessor(
        (row) => `${row.first_name} ${row.last_name}`.trim(),
        { id: "name", header: t("settings.team.name") },
      ),
      columnHelper.accessor("role", {
        header: t("settings.team.role"),
        cell: (info) => t(`settings.team.roles.${info.getValue()}`, info.getValue()),
      }),
      columnHelper.accessor("site_names", {
        header: t("settings.team.sites"),
        cell: (info) => {
          const names = info.getValue();
          return names?.length ? names.join(", ") : "—";
        },
      }),
      columnHelper.accessor("is_active", {
        header: t("settings.team.status"),
        cell: (info) => (info.getValue() ? t("settings.team.active") : t("settings.team.pending")),
      }),
    ],
    [t],
  );

  // TanStack Table returns unstable function refs by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const toggleSite = (siteId: number) => {
    setInvite((prev) => {
      const exists = prev.site_ids.includes(siteId);
      return {
        ...prev,
        site_ids: exists
          ? prev.site_ids.filter((id) => id !== siteId)
          : [...prev.site_ids, siteId],
      };
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await settingsService.inviteMember(invite);
      setInvite({ email: "", first_name: "", last_name: "", role: "site_manager", site_ids: [] });
      setMessage(t("settings.team.inviteSuccess"));
      await loadTeam();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return <p className="text-sm text-muted">{t("settings.team.ownerOnly")}</p>;
  }

  return (
    <div className="form-stack">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleInvite} className="form-stack">
        <h4 className="font-medium">{t("settings.team.inviteTitle")}</h4>
        <Input
          label={t("auth.email")}
          type="email"
          value={invite.email}
          onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("auth.firstName")}
            value={invite.first_name}
            onChange={(e) => setInvite((p) => ({ ...p, first_name: e.target.value }))}
          />
          <Input
            label={t("auth.lastName")}
            value={invite.last_name}
            onChange={(e) => setInvite((p) => ({ ...p, last_name: e.target.value }))}
          />
        </div>
        <Select
          label={t("settings.team.role")}
          value={invite.role}
          onChange={(role) =>
            setInvite((p) => ({
              ...p,
              role,
              site_ids: role === "site_manager" ? p.site_ids : [],
            }))
          }
          options={[
            { value: "admin", label: t("settings.team.roles.admin") },
            { value: "site_manager", label: t("settings.team.roles.site_manager") },
            { value: "accountant", label: t("settings.team.roles.accountant") },
          ]}
        />
        {invite.role === "site_manager" && (
          <div className="form-label">
            <span className="form-label-text">{t("settings.team.assignSites")}</span>
            <div className="site-checkbox-list">
              {sites.length === 0 ? (
                <p className="text-sm text-muted">{t("settings.team.noSites")}</p>
              ) : (
                sites.map((site) => (
                  <label key={site.id} className="site-checkbox-item">
                    <input
                      type="checkbox"
                      checked={invite.site_ids.includes(site.id)}
                      onChange={() => toggleSite(site.id)}
                    />
                    <span>{site.code ? `${site.name} (${site.code})` : site.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
        {message && <p className="text-success">{message}</p>}
        {error && <p className="text-error">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? t("common.loading") : t("settings.team.invite")}
        </Button>
      </form>
    </div>
  );
}
