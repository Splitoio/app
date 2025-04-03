export const API_ENDPOINTS = {
  auth: {
    testLogin: "/auth/test-login",
  },
  groups: {
    create: "/groups",
    expenses: (groupId: number) => `/groups/${groupId}/expenses`,
    balances: "/groups/balances",
  },
  users: {
    friends: {
      invite: "/users/friends/invite",
    },
  },
};
