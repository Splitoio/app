import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "../api/client";

export const useUploadFile = () => {
  return useMutation({
    mutationFn: uploadFile,
  });
};
