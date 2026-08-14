/**
 * 扫码对账系统 API
 * 提供容器管理和扫码记录的CRUD操作
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessModule, UserRole } from "@/lib/permissions";

// 验证用户是否有权限访问扫码对账模块
async function checkPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }
  
  const userRole = (session.user.role || 'CUSTOMER') as UserRole;
  if (!canAccessModule(userRole, 'skuScan')) {
    return { error: "Forbidden", status: 403 };
  }
  
  return { session, userRole };
}

// GET - 获取容器列表或扫码记录
export async function GET(request: NextRequest) {
  const auth = await checkPermission();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'containers' or 'scans'
  const containerId = searchParams.get('containerId');
  const containerNo = searchParams.get('containerNo');
  const status = searchParams.get('status');

  try {
    // 获取扫码记录（通过容器ID或容器编号）
    if (type === 'scans') {
      let targetContainerId: string | null = containerId;
      
      // 如果提供的是containerNo，先查找对应的容器
      if (!targetContainerId && containerNo) {
        const container = await prisma.scanContainer.findUnique({
          where: { containerNo }
        });
        targetContainerId = container?.id ?? null;
      }
      
      if (!targetContainerId) {
        return NextResponse.json({ data: [] });
      }

      const scans = await prisma.skuScan.findMany({
        where: { containerId: targetContainerId },
        orderBy: { createdAt: 'asc' },
        include: {
          container: {
            select: { containerNo: true }
          }
        }
      });

      return NextResponse.json({ 
        data: scans.map(scan => ({
          id: scan.id,
          sku: scan.sku,
          raw_code: scan.rawCode,
          qty: scan.qty,
          pallet_no: scan.palletNo,
          box_no: scan.boxNo,
          operator: scan.operator,
          createdAt: scan.createdAt,
          containerNo: scan.container.containerNo
        }))
      });
    }

    // 获取单个容器详情（包含Excel数据）
    if (type === 'container' && containerId) {
      const container = await prisma.scanContainer.findUnique({
        where: { id: containerId }
      });
      
      if (!container) {
        return NextResponse.json({ error: "Container not found" }, { status: 404 });
      }
      
      // 计算去重SKU种类数
      const skuCount = await prisma.skuScan.groupBy({
        by: ['sku'],
        where: { containerId }
      });
      
      return NextResponse.json({
        data: {
          ...container,
          scanCount: skuCount.length  // SKU种类数
        }
      });
    }

    // 获取容器列表
    const whereClause: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (containerNo) {
      whereClause.containerNo = { contains: containerNo, mode: 'insensitive' };
    }

    const containers = await prisma.scanContainer.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // 批量获取每个容器的去重SKU种类数
    const containerIds = containers.map(c => c.id);
    const skuCounts = await prisma.skuScan.groupBy({
      by: ['containerId', 'sku'],
      where: { containerId: { in: containerIds } }
    });
    
    // 统计每个容器的SKU种类数
    const countMap = new Map<string, number>();
    skuCounts.forEach(item => {
      const current = countMap.get(item.containerId) || 0;
      countMap.set(item.containerId, current + 1);
    });

    return NextResponse.json({ 
      data: containers.map(c => ({
        ...c,
        scanCount: countMap.get(c.id) || 0  // SKU种类数
      }))
    });

  } catch (error) {
    console.error("Error fetching sku-scan data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST - 创建容器或扫码记录
export async function POST(request: NextRequest) {
  const auth = await checkPermission();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { type } = body;

    // 创建新容器
    if (type === 'container') {
      const { containerNo, description, mode } = body;
      
      if (!containerNo) {
        return NextResponse.json(
          { error: "Container number is required" },
          { status: 400 }
        );
      }

      // 检查是否已存在
      const existing = await prisma.scanContainer.findUnique({
        where: { containerNo }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: "Container number already exists" },
          { status: 409 }
        );
      }

      const container = await prisma.scanContainer.create({
        data: {
          containerNo,
          description: description || null,
          mode: mode || 'MANUAL',  // 默认为手动模式
          createdBy: auth.session.user.email!,
        }
      });

      return NextResponse.json({ data: container }, { status: 201 });
    }

    // 创建或更新扫码记录（相同SKU只保留一条记录，更新qty）
    if (type === 'scan') {
      const { container_no, sku, raw_code, qty, pallet_no, box_no, operator } = body;

      if (!container_no || !sku) {
        return NextResponse.json(
          { error: "Container number and SKU are required" },
          { status: 400 }
        );
      }

      // 查找或创建容器
      let container = await prisma.scanContainer.findUnique({
        where: { containerNo: container_no }
      });

      if (!container) {
        container = await prisma.scanContainer.create({
          data: {
            containerNo: container_no,
            createdBy: operator || auth.session.user.email!,
          }
        });
      }

      // 查找是否已存在该SKU的记录
      const existingScan = await prisma.skuScan.findFirst({
        where: {
          containerId: container.id,
          sku: sku
        }
      });

      let scan;
      if (existingScan) {
        // 已存在：更新qty（累加）
        const updateData: Record<string, unknown> = {
          qty: existingScan.qty + (qty || 1),
          rawCode: raw_code || existingScan.rawCode,
          operator: operator || existingScan.operator,
        };
        if (pallet_no !== undefined) updateData.palletNo = pallet_no;
        if (box_no !== undefined) updateData.boxNo = box_no;
        
        scan = await prisma.skuScan.update({
          where: { id: existingScan.id },
          data: updateData
        });
      } else {
        // 不存在：创建新记录
        scan = await prisma.skuScan.create({
          data: {
            containerId: container.id,
            sku,
            rawCode: raw_code || sku,
            qty: qty || 1,
            palletNo: pallet_no || null,
            boxNo: box_no || null,
            operator: operator || auth.session.user.name || auth.session.user.email!,
          }
        });
      }

      return NextResponse.json({ 
        data: {
          id: scan.id,
          sku: scan.sku,
          raw_code: scan.rawCode,
          qty: scan.qty,
          pallet_no: scan.palletNo,
          box_no: scan.boxNo,
          operator: scan.operator,
          createdAt: scan.createdAt,
          containerNo: container.containerNo,
          isUpdate: !!existingScan  // 告诉前端是更新还是新建
        }
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error creating sku-scan data:", error);
    return NextResponse.json(
      { error: "Failed to create data" },
      { status: 500 }
    );
  }
}

// PUT - 更新容器状态
export async function PUT(request: NextRequest) {
  const auth = await checkPermission();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { type } = body;

    // 更新扫码记录（pallet_no, box_no, qty）
    if (type === 'updateScan') {
      const { scanId, pallet_no, box_no, qty } = body;
      
      if (!scanId) {
        return NextResponse.json(
          { error: "Scan ID is required" },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (pallet_no !== undefined) updateData.palletNo = pallet_no;
      if (box_no !== undefined) updateData.boxNo = box_no;
      if (qty !== undefined) updateData.qty = parseInt(String(qty)) || 1;

      const scan = await prisma.skuScan.update({
        where: { id: scanId },
        data: updateData
      });

      return NextResponse.json({ data: scan });
    }

    // 更新容器
    const { id, status, description } = body;

    if (!id && type !== 'container') {
      return NextResponse.json(
        { error: "Container ID is required" },
        { status: 400 }
      );
    }

    // 支持 containerId 或 id
    const containerId = body.containerId || id;
    
    if (!containerId) {
      return NextResponse.json(
        { error: "Container ID is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (body.mode) updateData.mode = body.mode;
    if (body.excelData !== undefined) updateData.excelData = body.excelData;
    if (body.dockNo !== undefined) updateData.dockNo = body.dockNo;  // 支持更新dockNo

    const container = await prisma.scanContainer.update({
      where: { id: containerId },
      data: updateData
    });

    return NextResponse.json({ data: container });

  } catch (error) {
    console.error("Error updating:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}

// DELETE - 删除容器或扫码记录
export async function DELETE(request: NextRequest) {
  const auth = await checkPermission();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: "ID is required" },
      { status: 400 }
    );
  }

  try {
    if (type === 'scan') {
      await prisma.skuScan.delete({
        where: { id }
      });
    } else {
      // 删除容器会级联删除所有扫码记录
      await prisma.scanContainer.delete({
        where: { id }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
