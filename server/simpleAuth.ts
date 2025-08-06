// Simple authentication for development phase
// This replaces Replit Auth with username/password login

export interface TestUser {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'member';
  position: string;
}

// NKF EXCO Members (2022-2026 term) for development
export const testUsers: TestUser[] = [
  // NKF Executive Committee Members
  {
    id: '1001',
    name: 'Darius Mostert',
    pin: 'DM2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1003',
    name: 'Marchelle de Jager',
    pin: 'MJ2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1004',
    name: 'Heinrich Hellmann',
    pin: 'HH2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1005',
    name: 'Sam Ekandjo',
    pin: 'SE2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1006',
    name: 'Damian Kapinga',
    pin: 'DK2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1007',
    name: 'Bonnie Kabasu',
    pin: 'BK2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1008',
    name: 'Theresa Swart',
    pin: 'TS2024',
    role: 'member',
    position: 'Executive Member'
  },
  {
    id: '1009',
    name: 'Nico Maritz',
    pin: 'NM2024',
    role: 'member',
    position: 'Executive Member'
  },
  // Secret admin account
  {
    id: '1002',
    name: 'System Admin',
    pin: 'NKF2025#Admin',
    role: 'admin',
    position: 'System Administrator'
  }
];

export function authenticateUser(name: string, pin: string): TestUser | null {
  console.log("Authenticating:", { name, pin, available: testUsers.map(u => ({ name: u.name, pin: u.pin })) });
  const user = testUsers.find(u => 
    u.name.toLowerCase() === name.toLowerCase() && u.pin === pin
  );
  console.log("Authentication result:", user ? "SUCCESS" : "FAILED");
  return user || null;
}

export function getUserById(id: string): TestUser | null {
  return testUsers.find(u => u.id === id) || null;
}

export function isAdmin(user: TestUser): boolean {
  return user.role === 'admin';
}