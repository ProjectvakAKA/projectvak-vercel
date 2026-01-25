type DropboxEntry = {
  ".tag": string;
  id?: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  client_modified?: string;
  server_modified?: string;
  rev?: string;
  size?: number;
  content_hash?: string;
};

type ListFolderResponse = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

export async function listFolder(
  accessToken: string,
  path: string,
  recursive = true
) {
  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      recursive,
      include_deleted: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox list_folder failed: ${text}`);
  }

  return (await response.json()) as ListFolderResponse;
}

export async function listFolderContinue(accessToken: string, cursor: string) {
  const response = await fetch(
    "https://api.dropboxapi.com/2/files/list_folder/continue",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox list_folder/continue failed: ${text}`);
  }

  return (await response.json()) as ListFolderResponse;
}

export async function downloadFile(accessToken: string, path: string) {
  const response = await fetch(
    "https://content.dropboxapi.com/2/files/download",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox download failed: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isPdfFile(entry: DropboxEntry) {
  return entry[".tag"] === "file" && entry.name.toLowerCase().endsWith(".pdf");
}

export function isFolder(entry: DropboxEntry) {
  return entry[".tag"] === "folder";
}

export type { DropboxEntry, ListFolderResponse };
