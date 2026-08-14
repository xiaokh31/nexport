import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      canManageArticles?: boolean;  // 员工文章管理权限
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    canManageArticles?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    canManageArticles?: boolean;
  }
}
