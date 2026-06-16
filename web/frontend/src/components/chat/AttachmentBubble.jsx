import { useState } from "react";
import { FileOutlined, FilePdfOutlined, FileImageOutlined, FileZipOutlined, DownloadOutlined, LoadingOutlined } from "@ant-design/icons";
import { Typography } from "antd";

const { Text } = Typography;

function fileIcon(mime) {
  if (!mime) return <FileOutlined />;
  if (mime.startsWith("image/")) return <FileImageOutlined />;
  if (mime === "application/pdf") return <FilePdfOutlined />;
  if (mime.includes("zip")) return <FileZipOutlined />;
  return <FileOutlined />;
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadFile(url, filename, mimeType) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: mimeType || res.headers.get("content-type") || "application/octet-stream" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function FileAttachment({ att, isMe }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadFile(att.url, att.original_name, att.mime_type);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <a
      href={att.url}
      onClick={handleDownload}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl no-underline transition-opacity hover:opacity-80
        ${isMe ? "bg-white/20" : "bg-white/10"}`}
    >
      <span className="text-lg text-gray-300">{fileIcon(att.mime_type)}</span>
      <div className="flex-1 min-w-0">
        <Text className="text-white text-xs truncate block">{att.original_name}</Text>
        <Text className="text-gray-400 text-xs">{fmtSize(att.size)}</Text>
      </div>
      {downloading ? (
        <LoadingOutlined className="text-gray-400 flex-shrink-0" />
      ) : (
        <DownloadOutlined className="text-gray-400 flex-shrink-0" />
      )}
    </a>
  );
}

export default function AttachmentBubble({ attachments = [], isMe }) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {attachments.map((att, i) => {
        const isImage = att.mime_type?.startsWith("image/");

        if (isImage) {
          return (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
              <img
                src={att.url}
                alt={att.original_name}
                className="max-w-[220px] rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          );
        }

        return <FileAttachment key={i} att={att} isMe={isMe} />;
      })}
    </div>
  );
}
