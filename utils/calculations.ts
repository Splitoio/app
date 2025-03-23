export function calculateBalances(groups: any[], userAddress: string | null) {
  if (!userAddress) return { totalOwed: 0, totalOwe: 0, netBalance: 0 };

  let totalOwed = 0;
  let totalOwe = 0;

  groups.forEach((group) => {
    // Skip if the group doesn't have the required data
    if (!group.groupBalances) return;

    // Find the user's balance in this group
    const myBalances = group.groupBalances.filter(
      (balance: any) => balance.userId === userAddress
    );

    // Add up positive balances (money owed to the user)
    const positiveBalances = myBalances.filter(
      (balance: any) => balance.amount > 0
    );
    totalOwed += positiveBalances.reduce(
      (sum: number, balance: any) => sum + balance.amount,
      0
    );

    // Add up negative balances (money the user owes)
    const negativeBalances = myBalances.filter(
      (balance: any) => balance.amount < 0
    );
    totalOwe += Math.abs(
      negativeBalances.reduce(
        (sum: number, balance: any) => sum + balance.amount,
        0
      )
    );
  });

  const netBalance = totalOwed - totalOwe;
  return { totalOwed, totalOwe, netBalance };
}

export function getTransactionsFromGroups(
  groups: any[],
  userAddress: string | null
) {
  if (!userAddress) return [];

  const transactions: {
    id: string;
    user: { name: string; image: string };
    amount: number;
    type: "owe" | "owed";
    date: string;
  }[] = [];

  groups.forEach((group) => {
    // Skip if expenses don't exist in the group
    if (!group.expenses) return;

    group.expenses.forEach((expense: any) => {
      // Skip if paidBy is not set
      if (!expense.paidBy) return;

      const paidByUser = group.groupUsers?.find(
        (gu: any) => gu.user.id === expense.paidBy
      )?.user;

      if (!paidByUser) return;

      if (expense.paidBy === userAddress) {
        // Current user paid, others owe them
        group.groupUsers?.forEach((gu: any) => {
          if (gu.user.id !== userAddress) {
            transactions.push({
              id: `${group.id}-${expense.id}-${gu.user.id}`,
              user: {
                name: gu.user.name || gu.user.id,
                image: `/api.dicebear.com/7.x/avataaars/svg?seed=${gu.user.id}`,
              },
              amount: expense.amount / group.groupUsers.length, // Simple equal split
              type: "owed",
              date: expense.createdAt || group.createdAt,
            });
          }
        });
      } else if (
        group.groupUsers?.some((gu: any) => gu.user.id === userAddress)
      ) {
        // User is part of this expense but didn't pay
        transactions.push({
          id: `${group.id}-${expense.id}-${userAddress}`,
          user: {
            name: paidByUser.name || paidByUser.id,
            image: `/api.dicebear.com/7.x/avataaars/svg?seed=${paidByUser.id}`,
          },
          amount: expense.amount / group.groupUsers.length, // Simple equal split
          type: "owe",
          date: expense.createdAt || group.createdAt,
        });
      }
    });
  });

  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
