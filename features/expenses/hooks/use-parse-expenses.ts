import { useMutation } from "@tanstack/react-query";
import { parseExpenses, ParseExpensesResponse } from "../api/client";

export const useParseExpenses = () => {
  return useMutation<ParseExpensesResponse, Error, string>({
    mutationFn: (text: string) => parseExpenses(text),
  });
};
