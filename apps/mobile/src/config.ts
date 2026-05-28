export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api",
  SOCKET_URL: (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace('/api', '/chat'),
};
