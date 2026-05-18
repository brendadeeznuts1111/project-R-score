import { createCookieClient } from "@/api/authenticated-client";
import { useFileStore } from "@/stores/fileStore";
import { Palette } from "@/utils/colors";
import { useEffect, useState } from "react";

export const FileAnalyzerWithAuth = () => {
  const { files, addFile } = useFileStore();
  const [authenticated, setAuthenticated] = useState(false);
  const client = createCookieClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await client.fetch("https://api.example.com/auth/verify");
      setAuthenticated(response.ok);
    } catch {
      setAuthenticated(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    const response = await client.fetch("https://api.example.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      setAuthenticated(true);
      if (import.meta.hot) {
        import.meta.hot.data.authenticated = true;
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!authenticated) {
      alert("Please log in first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await client.fetch("https://api.example.com/files/analyze", {
      method: "POST",
      body: formData,
    });

    const analysis = await response.json();
    addFile({ id: crypto.randomUUID(), name: file.name, ...analysis.data });
  };

  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      import.meta.hot.data.authenticated = authenticated;
    });
    if (import.meta.hot.data.authenticated) {
      setAuthenticated(true);
    }
  }

  return (
    <div style={{
      border: `2px solid ${authenticated ? Palette.api.primary : Palette.error.primary}`,
      background: authenticated ? Palette.api.gradient : Palette.error.gradient,
    }}>
      {authenticated ? (
        <>
          <h2 style={{ color: Palette.frontend.primary }}>Authenticated Upload</h2>
          <DropZone onDrop={handleFileUpload} />
        </>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
};

function DropZone({ onDrop }: { onDrop: (file: File) => void }) {
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.files[0]); }}>
      Drop files here
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (u: string, p: string) => void }) {
  return <form onSubmit={(e) => { e.preventDefault(); onLogin("admin", "password"); }}>Login form</form>;
}
