export interface User {
  id: string;
  is_active: boolean;
  platform_role: string;
  email: string;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const listAllUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_URL}/api/auth/test-notification`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Fetched users:", data);
    return data || [];
  } catch (error) {
    console.error("❌ Failed to fetch users:", error);
    throw error;
  }
};
