"use client";

import { MasteryNav } from "../components/MasteryNav";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";

type JobStatus = {
  status: string;
  step: string | null;
  progressPct: number;
};

const POLL_MS = 2000;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [userId, setUserId] = useState("");
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
    if (!userId.trim() || !goalId.trim()) {
      setError("userId and goalId are required");
      return;
    }

    setUploading(true);
    setError(null);
    setJob(null);
    stopPolling();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId.trim());
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
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 720 }}>
        <MasteryNav activeHref="/upload" />

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
          PHASE 2 INGESTION
        </p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.06em", margin: "12px 0 8px" }}>
          Upload lecture PDF
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          File goes to S3, then an async worker parses, chunks, and embeds it. Poll job progress below.
        </p>

        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>userId (UUID)</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-4000-8000-000000000001"
              disabled={uploading}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>goalId (UUID)</span>
            <input
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              placeholder="00000000-0000-4000-8000-000000000002"
              disabled={uploading}
              style={fieldStyle}
            />
          </label>
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
          <p style={{ margin: 0, fontWeight: 700 }}>{file ? file.name : "Drag & drop a PDF here"}</p>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "8px 0 0" }}>
            or click to browse
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={uploading || !file}
          style={{
            background: uploading ? "rgba(56, 189, 248, 0.35)" : "#38bdf8",
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
          {uploading ? "Uploading…" : "Upload & process"}
        </button>

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
            <p style={{ color: "#94a3b8", margin: "0 0 8px" }}>Ingestion job</p>
            {jobId ? (
              <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 4px", wordBreak: "break-all" }}>
                jobId: {jobId}
              </p>
            ) : null}
            {documentId ? (
              <p style={{ fontSize: 13, color: "#cbd5e1", margin: "0 0 16px", wordBreak: "break-all" }}>
                documentId: {documentId}
              </p>
            ) : null}

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
                  background: isTerminal && job?.status === "error" ? "#f87171" : "#38bdf8",
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
              <span style={{ color: "#e2e8f0", fontSize: 14 }}>
                {job?.step ?? "Waiting for status…"}
              </span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>{progressPct}%</span>
            </div>

            {job?.status ? (
              <p
                style={{
                  color: job.status === "done" ? "#4ade80" : job.status === "error" ? "#f87171" : "#cbd5e1",
                  fontSize: 14,
                  marginBottom: 0,
                  marginTop: 12,
                }}
              >
                Status: {job.status}
              </p>
            ) : null}

            {job?.status === "done" ? (
              <>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "16px 0 8px" }}>
                  Chunks embedded. Generating cited questions in the background…
                </p>
                <a
                  href={`/study?goalId=${encodeURIComponent(goalId)}`}
                  style={{
                    background: "#38bdf8",
                    borderRadius: 12,
                    color: "#08111f",
                    display: "inline-block",
                    fontWeight: 700,
                    padding: "12px 18px",
                    textDecoration: "none",
                  }}
                >
                  Study generated questions →
                </a>
              </>
            ) : null}
          </aside>
        )}
      </section>
    </main>
  );
}

const fieldStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 12,
  color: "#f8fafc",
  fontSize: 14,
  padding: "12px 14px",
};
