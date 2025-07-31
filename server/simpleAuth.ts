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
  // Standard test accounts for peers
  {
    id: '1001',
    name: 'President',
    pin: '1234',
    role: 'member',
    position: 'Admin President'
  },
  {
    id: '1002', 
    name: 'Vice President',
    pin: '5678',
    role: 'member',
    position: 'Vice President'
  },
  {
    id: '1003',
    name: 'Secretary',
    pin: '9012',
    role: 'member',
    position: 'Secretary'
  },
  {
    id: '1004',
    name: 'Treasurer',
    pin: '3456',
    role: 'member',
    position: 'Treasurer'
  },
  {
    id: '1005',
    name: 'Technical Director',
    pin: '7890',
    role: 'member',
    position: 'Technical Director'
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