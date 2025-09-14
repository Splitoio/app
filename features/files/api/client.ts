import { apiClient } from "@/api-helpers/client";
import { z } from "zod";
import axios from "axios";
const uploadRequestSchema = z.object({
  fileType: z.string().min(1, "File type is required"),
  fileName: z.string().optional(),
  folder: z.string().optional(),
});

const uploadResponseSchema = z.object({
  uploadUrl: z.string(),
  filePath: z.string(),
  expiresIn: z.number(),
  downloadUrl: z.string(),
});

export const generateUploadUrl = async (
  payload: z.infer<typeof uploadRequestSchema>
) => {
  const response = await apiClient.post("/files/upload-url", payload);
  return uploadResponseSchema.parse(response);
};

export const uploadFile = async (file: File) => {
  try {
    const uploadData = await generateUploadUrl({
      fileType: file.type,
      fileName: file.name,
    });

    await axios.put(uploadData.uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    return {
      success: true,
      data: {
        downloadUrl: uploadData.downloadUrl,
        filePath: uploadData.filePath,
      },
    };
  } catch (error) {
    throw error;
  }
};
