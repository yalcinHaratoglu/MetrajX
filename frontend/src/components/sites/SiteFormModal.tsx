import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { SiteForm } from "./SiteForm";
import type { Site } from "../../services/siteService";

interface SiteFormModalProps {
  open: boolean;
  onClose: () => void;
  site?: Site | null;
  onSaved: (site: Site) => void;
}

export function SiteFormModal({ open, onClose, site, onSaved }: SiteFormModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(site);
  const [saving, setSaving] = useState(false);
  const formId = isEdit ? "edit-site-form" : "create-site-form";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t("sites.editTitle") : t("sites.createTitle")}
      className="modal-wide"
      bodyClassName="modal-body-scroll"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? t("common.loading") : isEdit ? t("common.save") : t("sites.create")}
          </Button>
        </>
      }
    >
      {open && (
        <SiteForm
          site={site}
          formId={formId}
          onSaved={onSaved}
          onSavingChange={setSaving}
        />
      )}
    </Modal>
  );
}
