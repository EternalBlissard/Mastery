"use client";

import { MasteryNav } from "../components/MasteryNav";
import GoalSelect from "../components/GoalSelect";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

type JobStatus = {
  status: string;
  step: string | null;
  progressPct: number;
};

const POLL_MS = 2000;

function humanProgressLabel(step: string | null | undefined, status: string | null | undefined): string {
  if (status === "done") {
    return "Ready to study";
  }
  if (status === "error") {
    return "Something went wrong";
  }
  const labels: Record<string, string> = {
    fetching: "Uploading",
    chunking: "Reading pages",
    embedding: "Generating study material",
    complete: "Preparing questions",
  };
  return labels[step ?? ""] ?? "Processing your PDF";
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [goalId, setGoalId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("goalId")?.trim() ?? "";
    if (fromUrl) {
      setGoalId(fromUrl);
    }
  }, []);

  const pickFile = useCallback((next: File | null) => {
    if (!next) {
      return;
    }
    setFile(next);
    setError(null);
    setJob(null);
    setJobId(null);
    setDocumentId(null);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) {
        pickFile(dropped);
      }
    },
    [pickFile],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();

      const poll = async () => {
        try {
          const res = await fetch(`/api/jobs/${id}`);
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(body?.error ?? "Failed to fetch job status");
            stopPolling();
            setUploading(false);
            return;
          }
          const data = (await res.json()) as JobStatus;
          setJob(data);
          if (data.status === "done" || data.status === "error") {
            stopPolling();
            setUploading(false);
          }
        } catch {
          setError("Network error while polling job status");
          stopPolling();
          setUploading(false);
        }
      };

      void poll();
      pollRef.current = setInterval(() => {
        void poll();
      }, POLL_MS);
    },
    [stopPolling],
  );

  const handleUpload = async () => {
    if (!file) {
      setError("Choose a PDF to upload");
      return;
    }
    if (!goalId.trim()) {
      setError("Pick a goal first");
      return;
    }

    setUploading(true);
    setError(null);
    setJob(null);
    stopPolling();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("goalId", goalId.trim());

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body = (await res.json()) as { jobId?: string; documentId?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Upload failed");
        setUploading(false);
        return;
      }
      if (!body.jobId) {
        setError("Upload response missing jobId");
        setUploading(false);
        return;
      }

      setJobId(body.jobId);
      setDocumentId(body.documentId ?? null);
      startPolling(body.jobId);
    } catch {
      setError("Network error during upload");
      setUploading(false);
    }
  };

  const progressPct = job?.progressPct ?? 0;
  const isTerminal = job?.status === "done" || job?.status === "error";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(52, 184, 255, 0.18), transparent 32rem), #07101D",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 720 }}>
        <MasteryNav activeHref="/upload" />

        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.05em", margin: "0 0 8px" }}>
          Upload lecture PDF
        </h1>
        <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>
          Drop your lecture notes. We&apos;ll turn them into practice questions linked to your pages.
        </p>

        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          <GoalSelect value={goalId} onChange={setGoalId} disabled={uploading} />
        </div>

        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          style={{
            background: dragOver ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.82)",
            border: dragOver
              ? "2px dashed #38bdf8"
              : "2px dashed rgba(148, 163, 184, 0.35)",
            borderRadius: 20,
            cursor: uploading ? "not-allowed" : "pointer",
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploading}
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>📄</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
            {file ? file.name : "Drop lecture PDF"}
          </p>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, margin: "8px 0 16px" }}>
            Supports PDF · Up to 100 MB
          </p>
          {!file ? (
            <span
              style={{
                background: "rgba(52, 184, 255, 0.12)",
                border: "1px solid rgba(52, 184, 255, 0.35)",
                borderRadius: 12,
                color: "#34B8FF",
                display: "inline-block",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 16px",
              }}
            >
              Browse files
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={uploading || !file}
          style={{
            background: uploading ? "rgba(52, 184, 255, 0.35)" : "#34B8FF",
            border: "none",
            borderRadius: 12,
            color: "#08111f",
            cursor: uploading || !file ? "not-allowed" : "pointer",
            fontWeight: 700,
            marginTop: 20,
            padding: "14px 20px",
            width: "100%",
          }}
        >
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>

        {!file && !uploading && !job ? (
          <p
            style={{
              color: "rgba(255,255,255,.45)",
              fontSize: 15,
              marginTop: 24,
              textAlign: "center",
            }}
          >
            No lecture uploaded. Drop your first PDF.
          </p>
        ) : null}

        {error ? (
          <p style={{ color: "#f87171", marginTop: 16 }} role="alert">
            {error}
          </p>
        ) : null}

        {(jobId || job) && (
          <aside
            style={{
              background: "rgba(15, 23, 42, 0.82)",
              border: "1px solid rgba(148, 163, 184, 0.24)",
              borderRadius: 20,
              marginTop: 28,
              padding: 24,
            }}
          >
            <p style={{ color: "rgba(255,255,255,.72)", fontWeight: 700, margin: "0 0 16px" }}>
              {humanProgressLabel(job?.step, job?.status)}
            </p>

            <div
              aria-label="Ingestion progress"
              style={{
                background: "rgba(2, 6, 23, 0.58)",
                borderRadius: 999,
                height: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: isTerminal && job?.status === "error" ? "#f87171" : "#34B8FF",
                  height: "100%",
                  transition: "width 0.3s ease",
                  width: `${Math.min(100, Math.max(0, progressPct))}%`,
                }}
              />
            </div>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
              }}
            >
              <span style={{ color: "rgba(255,255,255,.72)", fontSize: 14 }}>
                {humanProgressLabel(job?.step, job?.status)}
              </span>
              <span style={{ color: "#34B8FF", fontWeight: 700 }}>{progressPct}%</span>
            </div>

            {job?.status === "done" ? (
              <>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, margin: "20px 0 12px" }}>
                  Your study material is ready. Start practicing with cited questions.
                </p>
                <a
                  href={`/study?goalId=${encodeURIComponent(goalId)}`}
                  style={{
                    background: "#34B8FF",
                    borderRadius: 14,
                    color: "#07101D",
                    display: "inline-block",
                    fontWeight: 800,
                    padding: "14px 20px",
                    textDecoration: "none",
                  }}
                >
                  Start studying →
                </a>
              </>
            ) : null}
          </aside>
        )}
      </section>
    </main>
  );
}
