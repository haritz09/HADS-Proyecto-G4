export interface AuthService {
    getToken: () => string | null;
    isAuthenticated: () => boolean;
}

export const authService: AuthService = {
    getToken: () => localStorage.getItem('token'),
    isAuthenticated: () => Boolean(localStorage.getItem('token'))
};
