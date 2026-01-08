export interface DesignListItem {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSED" | "ERROR";
  itemsCount: number;
  coverageRatio: number;
  issues: Array<"EMPTY" | "OUT_OF_BOUNDS">;
  createdAt: string;
}

export interface DesignItem {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  issue?: "OUT_OF_BOUNDS";
}

export interface DesignDetails {
  id: string;
  filename: string;
  filePath?: string;
  status: "PENDING" | "PROCESSED" | "ERROR";
  createdAt: string;
  svgWidth: number;
  svgHeight: number;
  items: DesignItem[];
  itemsCount: number;
  coverageRatio: number;
  issues: Array<"EMPTY" | "OUT_OF_BOUNDS">;
}
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8888";
export const uploadDesign = async (
  file: File
): Promise<{ design: DesignListItem }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload design");
  }

  return response.json();
};

export const getDesigns = async (): Promise<DesignListItem[]> => {
  const response = await fetch(`${API_BASE_URL}/api/designs`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch designs");
  }

  return response.json();
};

export const getDesignById = async (id: string): Promise<DesignDetails> => {
  const response = await fetch(`${API_BASE_URL}/api/designs/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch design");
  }

  return response.json();
};

export const deleteDesign = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/designs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to delete design");
  }
};
