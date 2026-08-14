import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getGoogleOAuthConfig, serverEnv } from "@/config/env/server";

const googleOAuthConfig = getGoogleOAuthConfig();

// 获取客户端IP地址
async function getClientIP(): Promise<string> {
  try {
    const headersList = await headers();
    // Vercel/Cloudflare 等平台的真实IP头
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    // 其他可能的IP头
    const realIP = headersList.get('x-real-ip');
    if (realIP) return realIP;
    
    const cfIP = headersList.get('cf-connecting-ip');
    if (cfIP) return cfIP;
    
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// 获取设备信息
async function getDeviceInfo(): Promise<{ device: string; userAgent: string }> {
  try {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    
    // 解析设备类型
    let device = '桌面端';
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('iphone')) {
      device = 'iPhone';
    } else if (ua.includes('ipad')) {
      device = 'iPad';
    } else if (ua.includes('android')) {
      if (ua.includes('mobile')) {
        device = 'Android 手机';
      } else {
        device = 'Android 平板';
      }
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
      device = 'Mac';
    } else if (ua.includes('windows')) {
      device = 'Windows PC';
    } else if (ua.includes('linux')) {
      device = 'Linux';
    }
    
    // 添加浏览器信息
    if (ua.includes('chrome') && !ua.includes('edg')) {
      device += ' / Chrome';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      device += ' / Safari';
    } else if (ua.includes('firefox')) {
      device += ' / Firefox';
    } else if (ua.includes('edg')) {
      device += ' / Edge';
    }
    
    return { device, userAgent };
  } catch {
    return { device: 'Unknown', userAgent: 'Unknown' };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  secret: serverEnv.nextAuthSecret,
  providers: [
    ...(googleOAuthConfig
      ? [
          GoogleProvider({
            clientId: googleOAuthConfig.clientId,
            clientSecret: googleOAuthConfig.clientSecret,
            allowDangerousEmailAccountLinking: true, // 允许链接已存在的邮箱账户
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱和密码");
        }

        // 从数据库查询用户
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          // 开发模式：如果数据库中没有用户，允许使用演示账号
          if (credentials.email === "demo@example.com" && credentials.password === "demo123") {
            return {
              id: "demo-user",
              email: credentials.email,
              name: "Demo User",
              role: "CUSTOMER",
            };
          }
          throw new Error("用户不存在");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("密码错误");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 首次登录时设置用户信息
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.canManageArticles = user.canManageArticles;
      }
      
      // 如果是刷新或更新，从数据库重新获取用户信息（确保角色变更能即时生效）
      if (trigger === 'update' || (token.id && !token.role)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.canManageArticles = (dbUser as any).canManageArticles || false;
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.canManageArticles = token.canManageArticles as boolean;
      }
      return session;
    },
  },
  events: {
    // 登录成功时记录登录历史
    async signIn({ user, account }) {
      if (user?.id) {
        try {
          const ip = await getClientIP();
          const { device, userAgent } = await getDeviceInfo();
          
          // 获取登录方式的友好名称
          let loginMethod = '邮箱密码登录';
          if (account?.provider === 'google') {
            loginMethod = 'Google 登录';
          } else if (account?.provider === 'github') {
            loginMethod = 'GitHub 登录';
          }
          
          await (prisma as any).loginHistory.create({
            data: {
              userId: user.id,
              ip: ip,
              userAgent: userAgent,
              device: `${device} (${loginMethod})`,
              status: 'SUCCESS',
            },
          });
        } catch (error) {
          console.error('Failed to record login history:', error);
        }
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
