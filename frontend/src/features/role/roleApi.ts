import { CustomRole } from "./types"

export async function getCustomRoles(): Promise<CustomRole[]> {
  try {
    const response = await fetch("/api/roles")
    if (!response.ok) {
      throw new Error("Failed to fetch custom roles")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching custom roles:", error)
    return []
  }
}

export async function createCustomRole(role: Omit<CustomRole, "id">): Promise<CustomRole> {
  try {
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(role),
    })
    if (!response.ok) {
      throw new Error("Failed to create custom role")
    }
    return await response.json()
  } catch (error) {
    console.error("Error creating custom role:", error)
    throw error
  }
}

export async function updateCustomRole(role: CustomRole): Promise<CustomRole> {
  try {
    const response = await fetch(`/api/roles/${role.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(role),
    })
    if (!response.ok) {
      throw new Error("Failed to update custom role")
    }
    return await response.json()
  } catch (error) {
    console.error("Error updating custom role:", error)
    throw error
  }
}

export async function deleteCustomRole(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      throw new Error("Failed to delete custom role")
    }
  } catch (error) {
    console.error("Error deleting custom role:", error)
    throw error
  }
} 