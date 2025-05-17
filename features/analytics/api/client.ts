import { apiClient } from "@/api-helpers/client";

export interface AnalyticsData {
  owed: string | number;
  lent: string | number;
  settled: string | number;
}

export const getAnalytics = async (): Promise<AnalyticsData> => {
  try {
    const response = await apiClient.get<AnalyticsData>("/analytics");
    
    // Handle both direct response and response.data cases
    const data = response?.data || response;
    
    if (!data || (typeof data.owed === 'undefined' && typeof data.lent === 'undefined' && typeof data.settled === 'undefined')) {
      throw new Error('Invalid analytics data format');
    }

    return {
      owed: data.owed,
      lent: data.lent,
      settled: data.settled
    };
  } catch (error) {
    console.error("Analytics API Error:", error);
    throw error; // Let the React Query hook handle the error
  }
}; 