import axios, { AxiosInstance, AxiosResponse } from "axios";
import { API_ENDPOINTS } from "./endpoints";
interface User {
  id: number;
  email: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface Group {
  id: number;
  name: string;
  currency: string;
}

interface Expense {
  paidBy: number;
  name: string;
  category: string;
  amount: number;
  splitType: "EQUAL";
  currency: string;
  participants: {
    userId: number;
    amount: number;
  }[];
}

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
      validateStatus: () => true,
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          return error.response;
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthToken(token: string) {
    this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  }

  // Auth
  async login(email: string): Promise<AxiosResponse<LoginResponse>> {
    const response = await this.api.post("/auth/test-login", { email });
    if (response.status === 200) {
      this.setAuthToken(response.data.token);
    }
    return response;
  }

  // Groups
  async createGroup(
    name: string,
    currency: string
  ): Promise<AxiosResponse<Group>> {
    return this.api.post("/groups", { name, currency });
  }

  // Friends
  async inviteFriend(
    email: string,
    sendInviteEmail = false
  ): Promise<AxiosResponse> {
    return this.api.post("/users/friends/invite", {
      email,
      sendInviteEmail,
    });
  }

  // Expenses
  async createExpense(
    groupId: number,
    expense: Expense
  ): Promise<AxiosResponse> {
    return this.api.post(`/groups/${groupId}/expenses`, expense);
  }

  // Balances
  async getBalances(): Promise<AxiosResponse> {
    return this.api.get("/groups/balances");
  }

  // Helper to check if response is successful
  isSuccess(response: AxiosResponse): boolean {
    return response.status === 200;
  }
}

export const apiClient = new ApiClient();
