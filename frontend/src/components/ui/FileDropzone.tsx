import { useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud } from "lucide-react";

interface FileDropzoneProps {
  accept: string;
  onSelect: (file: File) => void;
  title: string;
  hint: string;
  file?: File | null;
}

export function FileDropzone({ accept, onSelect, title, hint, file }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dropzone-active" : ""}`.trim()}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <div className="dropzone-icon">
        <UploadCloud size={24} />
      </div>
      <p className="dropzone-text">{title}</p>
      <p className="dropzone-hint">{hint}</p>
      {file && (
        <p className="dropzone-file">
          <FileText size={14} />
          {file.name}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onSelect(selected);
          event.target.value = "";
        }}
      />
    </div>
  );
}
