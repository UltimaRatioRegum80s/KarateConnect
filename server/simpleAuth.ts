// Simple authentication for development phase
// This replaces Replit Auth with username/password login

export interface TestUser {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'member';
  position: string;
}

// Test user accounts for development
export const testUsers: TestUser[] = [
  // Standard test account for peers
  {
    id: '1001',
    name: 'Test User',
    pin: '1234',
    role: 'member',
    position: 'Test Member'
  },
  // Secret admin account
  {
    id: 'admin-001',
    name: 'System Admin',
    pin: 'NKF2025#Admin',
    role: 'admin',
    position: 'System Administrator'
  }
];

export function authenticateUser(name: string, pin: string): TestUser | null {
  const user = testUsers.find(u => 
    u.name.toLowerCase() === name.toLowerCase() && u.pin === pin
  );
  return user || null;
}

export function getUserById(id: string): TestUser | null {
  return testUsers.find(u => u.id === id) || null;
}

export function isAdmin(user: TestUser): boolean {
  return user.role === 'admin';
}