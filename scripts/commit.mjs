#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { select, input, confirm } from "@inquirer/prompts";

const TYPES = [
  { value: "feat", name: "feat      — Yeni özellik" },
  { value: "fix", name: "fix       — Hata düzeltme" },
  { value: "refactor", name: "refactor  — Kod yenileme" },
  { value: "style", name: "style     — UI / CSS" },
  { value: "test", name: "test      — Test" },
  { value: "docs", name: "docs      — Dokümantasyon" },
  { value: "chore", name: "chore     — Araç / config" },
  { value: "build", name: "build     — Build / bağımlılık" },
  { value: "ci", name: "ci        — CI/CD" },
  { value: "perf", name: "perf      — Performans" },
];

const SCOPES = [
  { value: "frontend", name: "frontend  — React / Vite" },
  { value: "backend", name: "backend   — Django / API" },
  { value: "all", name: "all       — Tüm proje" },
];

function git(...args) {
  const result = spawnSync("git", args, {
    stdio: "inherit",
    encoding: "utf-8",
  });
  return result.status ?? 1;
}

function gitOutput(...args) {
  return spawnSync("git", args, { encoding: "utf-8" });
}

function hasStagedFiles() {
  const staged = gitOutput("diff", "--cached", "--name-only");
  return Boolean(staged.stdout?.trim());
}

async function main() {
  console.log("\n MetrajX — Commit Oluşturucu\n");

  if (!hasStagedFiles()) {
    const stageAll = await confirm({
      message: "Staged dosya yok. Tüm değişiklikleri stage edeyim mi? (git add .)",
      default: true,
    });
    if (!stageAll) {
      console.log("Önce dosyaları stage edin: git add .");
      process.exit(1);
    }
    const addCode = git("add", ".");
    if (addCode !== 0) {
      process.exit(addCode);
    }
    if (!hasStagedFiles()) {
      console.log("Commitlenecek değişiklik bulunamadı.");
      process.exit(1);
    }
  }

  const type = await select({ message: "Commit tipi seçin:", choices: TYPES });
  const scope = await select({ message: "Kapsam seçin:", choices: SCOPES });
  const subject = await input({
    message: "Commit mesajı:",
    validate: (value) => {
      if (!value.trim()) return "Mesaj boş olamaz.";
      if (value.length > 72) return "Mesaj 72 karakterden kısa olmalı.";
      return true;
    },
  });

  const header = `${type}(${scope}): ${subject.trim()}`;

  console.log(`\n  → ${header}\n`);

  const proceed = await confirm({ message: "Bu mesajla commit atılsın mı?", default: true });
  if (!proceed) {
    console.log("Commit iptal edildi.");
    process.exit(0);
  }

  const code = git("commit", "-m", header);
  if (code !== 0) {
    console.error("\nCommit başarısız. pre-commit hook (pnpm check) hata vermiş olabilir.");
    process.exit(code);
  }
}

main().catch((error) => {
  if (error?.name === "ExitPromptError") {
    console.log("\nCommit iptal edildi.");
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});
