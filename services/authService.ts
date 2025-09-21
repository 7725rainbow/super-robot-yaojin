import { User } from '../types';

// In a real app, this would be a secure backend. For this example, we use localStorage.
const USERS_KEY = 'auth_users_YaoJin';
const SESSION_KEY = 'auth_session_YaoJin';

// Simulate a simple password hash (do not use in production!)
const pseudoHash = (password: string) => `hashed_${password}`;

const getUsers = (): Record<string, User & { passwordHash: string }> => {
  try {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : {};
  } catch (e) {
    return {};
  }
};

const saveUsers = (users: Record<string, User & { passwordHash: string }>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
  return new Promise(resolve => {
    setTimeout(() => { // Simulate network delay
      const users = getUsers();
      if (users[email]) {
        resolve({ success: false, message: '此邮箱已被注册' });
        return;
      }
      if (Object.values(users).some(u => u.username === username)) {
          resolve({ success: false, message: '此用户名已被占用'});
          return;
      }

      users[email] = {
        username,
        email,
        passwordHash: pseudoHash(password),
      };
      saveUsers(users);
      resolve({ success: true, message: '注册成功！' });
    }, 500);
  });
};


export const login = async (email: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
  return new Promise(resolve => {
     setTimeout(() => { // Simulate network delay
        const users = getUsers();
        const user = users[email];
        if (!user || user.passwordHash !== pseudoHash(password)) {
            resolve({ success: false, message: '邮箱或密码错误' });
            return;
        }

        const sessionUser: User = { username: user.username, email: user.email };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        resolve({ success: true, message: '登录成功！', user: sessionUser });
    }, 500);
  });
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (e) {
    return null;
  }
};