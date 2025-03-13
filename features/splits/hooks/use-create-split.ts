// import { queryClient } from "@/api/client";
// import { useMutation } from "@tanstack/react-query";

// // src/features/splits/hooks/use-create-split.ts
// export const useCreateSplit = () => {
//   return useMutation({
//     mutationFn: createSplit,
//     onMutate: async (newSplit) => {
//       await queryClient.cancelQueries({ queryKey: ["splits"] });

//       const previousSplits = queryClient.getQueryData(["splits"]);

//       queryClient.setQueryData(["splits"], (old) => [
//         ...(old || []),
//         { ...newSplit, _optimistic: true },
//       ]);

//       return { previousSplits };
//     },
//     onError: (err, variables, context) => {
//       queryClient.setQueryData(["splits"], context?.previousSplits);
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["splits"] });
//       queryClient.invalidateQueries({ queryKey: ["balance"] });
//     },
//   });
// };
