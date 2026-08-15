// 管理员用户管理 API
import { NextRequest, NextResponse } from 'next/server';
import { requireCapability } from '@/lib/authorization';
import { prisma } from '@/lib/prisma';
import { UserRole, Prisma } from '@prisma/client';

class UserManagementError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function userManagementErrorResponse(error: unknown, fallback: string) {
  if (error instanceof UserManagementError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    if (error.code === 'P2034') {
      return NextResponse.json(
        { error: '用户权限同时发生变化，请重试' },
        { status: 409 },
      );
    }
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

// GET - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const authorization = await requireCapability('users.manage');
    if (!authorization.authorized) return authorization.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};
    
    if (role && role !== 'all' && !Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json({ error: '无效的角色值' }, { status: 400 });
    }
    if (role && role !== 'all') {
      where.role = role as UserRole;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          role: true,
          emailVerified: true,
          image: true,
          canManageArticles: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// PATCH - 更新用户状态
export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireCapability('users.manage');
    if (!authorization.authorized) return authorization.response;

    const body = await request.json();
    const { id, role, name, phone, company, canManageArticles } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 验证角色是否有效
    if (role && !Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { error: '无效的角色值' },
        { status: 400 }
      );
    }
    if (canManageArticles !== undefined && typeof canManageArticles !== 'boolean') {
      return NextResponse.json(
        { error: '文章管理权限必须是布尔值' },
        { status: 400 },
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id } });
      if (!current) throw new UserManagementError('用户不存在', 404);

      const nextRole = role ? (role as UserRole) : current.role;
      if (current.role === UserRole.ADMIN && nextRole !== UserRole.ADMIN) {
        const adminCount = await tx.user.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1) {
          throw new UserManagementError('不能降级最后一个管理员', 409);
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        canManageArticles:
          nextRole === UserRole.STAFF
            ? canManageArticles ?? current.canManageArticles
            : false,
      };
      if (role) updateData.role = nextRole;
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (company !== undefined) updateData.company = company;

      return tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          role: true,
          emailVerified: true,
          image: true,
          canManageArticles: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    return userManagementErrorResponse(error, '更新用户信息失败');
  }
}

// DELETE - 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const authorization = await requireCapability('users.manage');
    if (!authorization.authorized) return authorization.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });
      if (!target) throw new UserManagementError('用户不存在', 404);

      if (target.role === UserRole.ADMIN) {
        const adminCount = await tx.user.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1) {
          throw new UserManagementError('不能删除最后一个管理员', 409);
        }
      }
      if (id === authorization.actor.id) {
        throw new UserManagementError('不能删除自己的账户', 400);
      }

      await tx.user.delete({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error) {
    return userManagementErrorResponse(error, '删除用户失败');
  }
}
