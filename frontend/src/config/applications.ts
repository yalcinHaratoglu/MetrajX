import { Scissors, type LucideIcon } from "lucide-react";

export type ApplicationDef = {
  id: string;
  path: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

export const APPLICATIONS: ApplicationDef[] = [
  {
    id: "rebar",
    path: "/rebar",
    icon: Scissors,
    titleKey: "nav.rebar",
    descKey: "applications.rebar.desc",
  },
];

export function isApplicationsPath(pathname: string): boolean {
  if (pathname === "/applications") return true;
  return APPLICATIONS.some(
    (app) => pathname === app.path || pathname.startsWith(`${app.path}/`),
  );
}
