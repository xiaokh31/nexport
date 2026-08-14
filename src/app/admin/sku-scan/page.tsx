"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Upload, 
  Download, 
  Camera, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Archive,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
  ScanLine
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";

// 动态导入手机扫码组件（避免SSR问题）
const Html5QrcodePlugin = dynamic(() => import("@/components/admin/html5-qrcode-plugin"), {
  ssr: false,
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

interface ScanContainer {
  id: string;
  containerNo: string;
  description: string | null;
  dockNo: string | null;  // 门号(DOCK) - 柜子在哪个门
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  mode: "MANUAL" | "EXCEL";  // 工作模式
  excelData?: unknown;  // Excel模板数据
  createdBy: string;
  createdAt: string;
  scanCount: number;
}

interface ScanRecord {
  id: string;
  sku: string;
  raw_code: string;
  qty: number;
  pallet_no: string | null;
  box_no: string | null;
  operator: string;
  createdAt: string;
}

interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined | string[];
  _skuValue?: string;
  _originalQty?: number;
  _isHighlighted?: boolean;
  _scanIds?: string[];  // 关联的扫码记录ID
  scannedSkuDisplay?: string;
  scannedQtyDisplay?: number;
  palletDisplay?: string;
  boxDisplay?: string;
  dockDisplay?: string;  // DOCK No.
  operatorDisplay?: string;
}

export default function SkuScanPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const skuScan = t.admin?.skuScan || {};
  
  // 容器管理状态
  const [containers, setContainers] = useState<ScanContainer[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<ScanContainer | null>(null);
  const [newContainerNo, setNewContainerNo] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContainerMode, setNewContainerMode] = useState<"MANUAL" | "EXCEL">("MANUAL");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // 扫码状态
  const [scanMode, setScanMode] = useState<"box" | "locate">("box");
  const [operator, setOperator] = useState("");
  // dockNo现在从ScanContainer读取，不再是独立状态
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [lastScannedInfo, setLastScannedInfo] = useState("...");
  
  // Excel数据
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [tableData, setTableData] = useState<ExcelRow[]>([]);
  const [skuColumnKey, setSkuColumnKey] = useState("");
  const [qtyColumnKey, setQtyColumnKey] = useState("");
  
  // 扫码枪缓冲
  const gunBuffer = useRef("");
  const lastGunTime = useRef(0);
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 手机扫码状态
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  
  // 自动刷新（多人协作）
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);  // 防止请求堆积
  const pendingSkusRef = useRef<Set<string>>(new Set());  // 防止Locate模式重复创建记录
  
  // 自动保存状态
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // localStorage键名
  const getStorageKey = (containerId: string) => `sku-scan-data-${containerId}`;

  // 保存数据到localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!selectedContainer || !tableData.length) return;
    
    const dataToSave = {
      originalHeaders,
      tableData,
      skuColumnKey,
      qtyColumnKey,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(getStorageKey(selectedContainer.id), JSON.stringify(dataToSave));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [selectedContainer, tableData, originalHeaders, skuColumnKey, qtyColumnKey]);

  // 从localStorage恢复数据
  const loadFromLocalStorage = useCallback((containerId: string) => {
    try {
      const saved = localStorage.getItem(getStorageKey(containerId));
      if (saved) {
        const data = JSON.parse(saved);
        if (data.tableData && data.tableData.length > 0) {
          setOriginalHeaders(data.originalHeaders || []);
          setTableData(data.tableData);
          setSkuColumnKey(data.skuColumnKey || '');
          setQtyColumnKey(data.qtyColumnKey || '');
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return false;
  }, []);

  // 清除localStorage数据
  const clearLocalStorage = useCallback(() => {
    if (!selectedContainer) return;
    localStorage.removeItem(getStorageKey(selectedContainer.id));
    setLastSaved(null);
  }, [selectedContainer]);

  // 自动保存：表格数据变化时自动保存
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (selectedContainer && tableData.length > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveToLocalStorage();
      }, 2000); // 2秒后自动保存
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [tableData, selectedContainer, saveToLocalStorage]);

  // 获取容器列表
  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      
      const res = await fetch(`/api/admin/sku-scan?${params}`);
      const data = await res.json();
      if (data.data) setContainers(data.data);
    } catch (error) {
      console.error("Failed to fetch containers:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // 获取扫码记录（带请求防堆积保护）
  const fetchScans = useCallback(async (containerId: string, tableDataToUse?: ExcelRow[], isAutoRefresh = false) => {
    // 自动刷新时，如果上一个请求还未完成，跳过本次
    if (isAutoRefresh && isFetchingRef.current) {
      return;
    }
    
    try {
      isFetchingRef.current = true;
      const res = await fetch(`/api/admin/sku-scan?type=scans&containerId=${containerId}`);
      const data = await res.json();
      if (data.data) {
        setScans(data.data);
        // 如果提供了tableData，直接使用；否则依赖当前状态
        if (tableDataToUse && tableDataToUse.length > 0) {
          // 直接更新传入的数据
          const newData = tableDataToUse.map(row => ({
            ...row,
            scannedQtyDisplay: 0,
            scannedSkuDisplay: "",
            palletDisplay: "",
            boxDisplay: "",
            operatorDisplay: "",
            _scanIds: [] as string[]
          }));
          
          // 收集未匹配的扫码记录（按SKU分组聚合）
          const unmatchedScans = new Map<string, { scan: ScanRecord; totalQty: number; scanIds: string[] }>();
          
          data.data.forEach((scan: ScanRecord) => {
            const row = newData.find(r => r._skuValue === scan.sku);
            if (row) {
              row.scannedSkuDisplay = scan.raw_code;
              row.scannedQtyDisplay = (row.scannedQtyDisplay || 0) + (scan.qty || 1);
              if (scan.pallet_no) row.palletDisplay = scan.pallet_no;
              if (scan.box_no) row.boxDisplay = scan.box_no;
              row.operatorDisplay = scan.operator;
              if (!row._scanIds) row._scanIds = [];
              (row._scanIds as string[]).push(scan.id);
            } else {
              // 未匹配的SKU，收集起来准备新增行
              const existing = unmatchedScans.get(scan.sku);
              if (existing) {
                existing.totalQty += (scan.qty || 1);
                existing.scanIds.push(scan.id);
              } else {
                unmatchedScans.set(scan.sku, {
                  scan,
                  totalQty: scan.qty || 1,
                  scanIds: [scan.id]
                });
              }
            }
          });
          
          // 为未匹配的SKU创建新行
          unmatchedScans.forEach(({ scan, totalQty, scanIds }, sku) => {
            const newRow = {
              _skuValue: sku,
              _originalQty: 0,
              _isHighlighted: false,
              _scanIds: scanIds,
              _isNewRow: true,  // 标记为新增行
              scannedSkuDisplay: scan.raw_code,
              scannedQtyDisplay: totalQty,
              palletDisplay: scan.pallet_no || '',
              boxDisplay: scan.box_no || '',
              dockDisplay: '',
              operatorDisplay: scan.operator || ''
            } as ExcelRow;
            // 将SKU填充到SKU列
            if (skuColumnKey) {
              newRow[skuColumnKey] = sku;
            }
            newData.push(newRow as typeof newData[0]);
          });
          
          setTableData(newData);
        } else {
          recalcTable(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  useEffect(() => {
    if (selectedContainer) {
      // EXCEL模式：从数据库加载Excel数据
      if (selectedContainer.mode === 'EXCEL' && selectedContainer.excelData) {
        const excelData = selectedContainer.excelData as {
          headers: string[];
          rawRows?: Record<string, string | number | null | undefined>[];  // 新格式
          rows?: ExcelRow[];  // 旧格式兼容
          skuColumnKey: string;
          qtyColumnKey: string;
        };
        
        const headers = excelData.headers;
        const skuCol = excelData.skuColumnKey;
        const qtyCol = excelData.qtyColumnKey;
        
        setOriginalHeaders(headers);
        setSkuColumnKey(skuCol);
        setQtyColumnKey(qtyCol);
        
        // 从原始数据重建表格数据
        const sourceRows = excelData.rawRows || excelData.rows || [];
        const data: ExcelRow[] = sourceRows.map((rawRow) => {
          const obj: ExcelRow = {
            _isHighlighted: false,
            scannedSkuDisplay: "",
            scannedQtyDisplay: 0,
            palletDisplay: "",
            boxDisplay: "",
            operatorDisplay: ""
          };
          // 复制原始字段
          headers.forEach(h => {
            if (h in rawRow) obj[h] = rawRow[h];
          });
          obj._skuValue = String(obj[skuCol] || "").trim();
          obj._originalQty = qtyCol ? (parseInt(String(obj[qtyCol])) || 0) : 0;
          return obj;
        });
        
        setTableData(data);
        setLastSaved(skuScan.restored || '已恢复');
        // 传入构建好的tableData，避免竞态条件
        fetchScans(selectedContainer.id, data);
      } else {
        // 清空Excel状态
        setTableData([]);
        setOriginalHeaders([]);
        fetchScans(selectedContainer.id);
      }
    } else {
      // 清空状态
      setTableData([]);
      setOriginalHeaders([]);
      setLastSaved(null);
    }
  }, [selectedContainer, fetchScans]);

  // 多人协作：定时刷新扫码记录（带防堆积保护）
  useEffect(() => {
    if (autoRefresh && selectedContainer) {
      // 根据记录数量动态调整刷新频率
      const refreshInterval = scans.length > 100 ? 5000 : 3000; // 记录多时减少刷新频率
      
      refreshIntervalRef.current = setInterval(() => {
        fetchScans(selectedContainer.id, undefined, true); // 标记为自动刷新
      }, refreshInterval);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, selectedContainer, fetchScans, scans.length]);

  // 设置默认操作人
  useEffect(() => {
    if (session?.user?.name && !operator) {
      setOperator(session.user.name);
    }
  }, [session, operator]);

  // 全局扫码枪监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，则不拦截
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selectedContainer) return;

      const currTime = Date.now();
      // 如果两次按键间隔超过500ms，视为新输入
      if (currTime - lastGunTime.current > 500) {
        gunBuffer.current = "";
      }
      lastGunTime.current = currTime;

      if (e.key === "Enter") {
        if (gunBuffer.current.length > 0) {
          processInput(gunBuffer.current);
          gunBuffer.current = "";
        }
      } else if (e.key.length === 1) {
        gunBuffer.current += e.key;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedContainer, tableData, operator, scanMode]);

  // 处理扫码输入
  const processInput = async (code: string) => {
    if (!selectedContainer) return;
    
    code = code.trim();
    if (!code) return;

    // MANUAL模式：直接扫码统计，不需要Excel匹配
    if (selectedContainer.mode === 'MANUAL') {
      setLastScannedInfo(code);
      playBeep("success");
      
      try {
        setSaving(true);
        const res = await fetch("/api/admin/sku-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "scan",
            container_no: selectedContainer.containerNo,
            sku: code,
            raw_code: code,
            qty: 1,
            operator: operator
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          // API返回 isUpdate 标志表示是更新还是新建
          if (data.data.isUpdate) {
            // 更新已有记录
            setScans(prev => prev.map(s => s.id === data.data.id ? data.data : s));
          } else {
            // 新建记录
            setScans(prev => [...prev, data.data]);
          }
          // 高亮并滚动到对应SKU
          highlightManualRow(code);
        }
      } catch (error) {
        alert(skuScan.saveFailed || "保存失败");
      } finally {
        setSaving(false);
      }
      return;
    }

    // EXCEL模式：需要匹配Excel中的SKU
    if (!tableData.length) {
      alert(skuScan.pleaseImportExcel || "请先导入Excel");
      return;
    }

    // 模糊匹配SKU
    const row = tableData.find(r => 
      r._skuValue && (code.includes(r._skuValue) || r._skuValue.includes(code))
    );

    if (row) {
      setLastScannedInfo(row._skuValue || "");
      highlightRow(row);
      playBeep("success");
      
      // 找到匹配行的索引
      const rowIdx = tableData.findIndex(r => r._skuValue === row._skuValue);

      // Locate模式：只定位+回填scanned sku，不计数
      if (scanMode === 'locate') {
        // 直接更新表格显示，不调用API
        setTableData(prev => prev.map((r, idx) => 
          idx === rowIdx ? { 
            ...r, 
            scannedSkuDisplay: code,  // 回填scanned sku
            operatorDisplay: operator || r.operatorDisplay
          } : r
        ));
        return;
      }

      // Box模式：调用API累加qty
      try {
        setSaving(true);
        const res = await fetch("/api/admin/sku-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "scan",
            container_no: selectedContainer.containerNo,
            sku: row._skuValue,
            raw_code: code,
            qty: 1,
            operator: operator
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          let newScans: ScanRecord[];
          if (data.data.isUpdate) {
            // 更新已有记录
            newScans = scans.map(s => s.id === data.data.id ? data.data : s);
          } else {
            // 新建记录
            newScans = [...scans, data.data];
          }
          setScans(newScans);
          
          // 确保当前行的scannedSkuDisplay被正确设置（解决模糊匹配时的回填问题）
          setTableData(prev => {
            const updated = prev.map((r, idx) => 
              idx === rowIdx ? { 
                ...r, 
                scannedSkuDisplay: code,
                scannedQtyDisplay: (r.scannedQtyDisplay || 0) + 1,
                operatorDisplay: operator || r.operatorDisplay,
                _scanIds: [...(r._scanIds || []), data.data.id]
              } : r
            );
            return updated;
          });
        }
      } catch (error) {
        alert(skuScan.saveFailed || "保存失败");
      } finally {
        setSaving(false);
      }
    } else {
      // 未在Excel中找到匹配，在表格末尾生成一条新记录
      setLastScannedInfo(`${skuScan.newSku || "新SKU"}: ${code}`);
      playBeep("success");  // 改为成功提示音
      
      try {
        setSaving(true);
        const res = await fetch("/api/admin/sku-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "scan",
            container_no: selectedContainer.containerNo,
            sku: code,  // 使用扫到的代码作为SKU
            raw_code: code,
            qty: 1,
            operator: operator
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          let newScans: ScanRecord[];
          if (data.data.isUpdate) {
            newScans = scans.map(s => s.id === data.data.id ? data.data : s);
          } else {
            newScans = [...scans, data.data];
          }
          setScans(newScans);
          
          // 在表格末尾添加新行（如果这个SKU还没有对应的行）
          const existingRowIdx = tableData.findIndex(r => r._skuValue === code);
          if (existingRowIdx === -1) {
            // 创建新行
            const newRow: ExcelRow = {
              _skuValue: code,
              _originalQty: 0,
              _isHighlighted: true,
              _scanIds: [data.data.id],
              scannedSkuDisplay: code,
              scannedQtyDisplay: data.data.qty,
              palletDisplay: data.data.pallet_no || '',
              boxDisplay: data.data.box_no || '',
              dockDisplay: '',  // dockNo是container级别属性
              operatorDisplay: data.data.operator || ''
            };
            // 将SKU列添加到新行
            if (skuColumnKey) {
              newRow[skuColumnKey] = code;
            }
            setTableData(prev => [...prev, newRow]);
            
            // 高亮新行并滚动到底部
            setTimeout(() => {
              const lastRowIdx = tableData.length;  // 新行的索引
              const rowEl = document.getElementById(`row-${lastRowIdx}`);
              if (rowEl) {
                rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // 移除高亮
              setTimeout(() => {
                setTableData(prev => prev.map((r, idx) => 
                  idx === prev.length - 1 ? { ...r, _isHighlighted: false } : r
                ));
              }, 1500);
            }, 100);
          } else {
            // 已存在的行，重新计算
            recalcTable(newScans);
          }
        }
      } catch (error) {
        alert(skuScan.saveFailed || "保存失败");
      } finally {
        setSaving(false);
      }
    }
  };

  // 手机摄像头扫码回调
  const onCameraScanSuccess = (decodedText: string) => {
    processInput(decodedText);
  };

  // 手动修改扫码记录的Qty/Pallet/Box
  const updateRowField = async (rowIdx: number, field: 'scannedQtyDisplay' | 'palletDisplay' | 'boxDisplay', value: string) => {
    let finalValue: string | number = value;
    
    if (field === 'palletDisplay') {
      // Pallet支持字符串输入（如 "1,2,5"），不做过滤
      finalValue = value;
    } else {
      // Qty和Box只允许数字，移除前导0
      let numericValue = value.replace(/[^0-9]/g, '');
      if (numericValue.length > 1 && numericValue.startsWith('0')) {
        numericValue = numericValue.replace(/^0+/, '');
      }
      finalValue = numericValue === '' ? '' : numericValue;
    }
    
    const row = tableData[rowIdx];
    const scanIds = row?._scanIds || [];
    
    // 更新本地状态
    setTableData(prev => prev.map((r, idx) => {
      if (idx === rowIdx) {
        if (field === 'scannedQtyDisplay') {
          return { ...r, [field]: finalValue === '' ? 0 : parseInt(String(finalValue)) };
        } else {
          return { ...r, [field]: finalValue };
        }
      }
      return r;
    }));
    
    // 保存Pallet/Box到数据库
    if ((field === 'palletDisplay' || field === 'boxDisplay') && scanIds.length > 0) {
      const apiField = field === 'palletDisplay' ? 'pallet_no' : 'box_no';
      // 更新所有关联的扫码记录
      for (const scanId of scanIds) {
        await fetch('/api/admin/sku-scan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'updateScan',
            scanId,
            [apiField]: finalValue
          })
        });
      }
      // 同步更新scans状态
      setScans(prev => prev.map(s => 
        scanIds.includes(s.id) 
          ? { ...s, [field === 'palletDisplay' ? 'pallet_no' : 'box_no']: finalValue } 
          : s
      ));
    }
    
    // 保存Qty到数据库
    if (field === 'scannedQtyDisplay') {
      const newTotal = finalValue === '' ? 0 : parseInt(String(finalValue));
      
      if (scanIds.length > 0) {
        // 已有记录：调整第一条记录的qty使总数匹配
        const firstScanId = scanIds[0];
        const otherScansQty = scans
          .filter(s => scanIds.includes(s.id) && s.id !== firstScanId)
          .reduce((sum, s) => sum + (s.qty || 1), 0);
        const newFirstQty = Math.max(0, newTotal - otherScansQty);
        
        await fetch('/api/admin/sku-scan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'updateScan',
            scanId: firstScanId,
            qty: newFirstQty
          })
        });
        // 同步更新scans状态
        setScans(prev => prev.map(s => 
          s.id === firstScanId ? { ...s, qty: newFirstQty } : s
        ));
      } else if (row.scannedSkuDisplay && selectedContainer && newTotal > 0) {
        // Locate模式：没有记录但已扫码定位过，需要创建新记录
        try {
          const res = await fetch('/api/admin/sku-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'scan',
              container_no: selectedContainer.containerNo,
              sku: row._skuValue,
              raw_code: row.scannedSkuDisplay,
              qty: newTotal,
              operator: operator
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            // 更新scans状态
            setScans(prev => [...prev, data.data]);
            // 更新当前行的_scanIds
            setTableData(prev => prev.map((r, idx) => 
              idx === rowIdx ? { ...r, _scanIds: [data.data.id] } : r
            ));
          }
        } catch (error) {
          console.error('Failed to create scan record:', error);
        }
      }
    }
  };

  // 手动输入SKU（数据丢失时手动补充）
  const handleManualSkuInput = async (rowIdx: number, inputSku: string) => {
    if (!selectedContainer || !inputSku.trim()) return;
    
    const row = tableData[rowIdx];
    const originalSku = String(row._skuValue || '');
    const existingDisplay = row.scannedSkuDisplay;
    
    // 如果输入的SKU与当前显示相同，不做任何操作
    if (inputSku === existingDisplay) return;
    
    // Double check 确认弹窗
    const confirmMsg = skuScan.confirmManualSku 
      ? skuScan.confirmManualSku.replace('{originalSku}', originalSku).replace('{inputSku}', inputSku)
      : `❗ 手动输入模式\n\n您正在手动输入扫码记录，请确认：\n原始SKU: ${originalSku}\n输入SKU: ${inputSku}\n\n确定要将此SKU记录到数据库吗？`;
    
    if (!confirm(confirmMsg)) {
      // 用户取消，恢复原值
      setTableData(prev => [...prev]); // 触发重新渲染
      return;
    }
    
    try {
      setSaving(true);
      
      // 调用API创建/更新扫码记录
      const res = await fetch("/api/admin/sku-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "scan",
          container_no: selectedContainer.containerNo,
          sku: originalSku,  // 使用原始SKU作为关联
          raw_code: inputSku,  // 记录手动输入的内容
          qty: 1,
          operator: operator
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        let newScans: ScanRecord[];
        if (data.data.isUpdate) {
          newScans = scans.map(s => s.id === data.data.id ? data.data : s);
        } else {
          newScans = [...scans, data.data];
        }
        setScans(newScans);
        recalcTable(newScans);
        
        // 显示成功提示
        setLastScannedInfo(`✅ ${skuScan.manualInputSuccess || "手动输入成功"}: ${inputSku}`);
        playBeep("success");
      }
    } catch (error) {
      alert(skuScan.saveFailed || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 重新计算表格显示
  const recalcTable = (currentScans: ScanRecord[]) => {
    if (!tableData.length) return;
    
    const newData = tableData.map(row => ({
      ...row,
      scannedQtyDisplay: 0,
      scannedSkuDisplay: "",
      palletDisplay: "",
      boxDisplay: "",
      dockDisplay: "",
      operatorDisplay: "",
      _scanIds: [] as string[]  // 保存关联的扫码记录ID
    }));

    // 收集未匹配的扫码记录（按SKU分组聚合）
    const unmatchedScans = new Map<string, { scan: ScanRecord; totalQty: number; scanIds: string[] }>();

    currentScans.forEach(scan => {
      const row = newData.find(r => r._skuValue === scan.sku);
      if (row) {
        // 使用raw_code显示完整扫码内容
        row.scannedSkuDisplay = scan.raw_code;
        row.scannedQtyDisplay = (row.scannedQtyDisplay || 0) + (scan.qty || 1);
        if (scan.pallet_no) row.palletDisplay = scan.pallet_no;
        if (scan.box_no) row.boxDisplay = scan.box_no;
        // dockNo现在是container级别的属性，不在scan中
        row.operatorDisplay = scan.operator;
        // 保存扫码记录ID用于后续更新
        if (!row._scanIds) row._scanIds = [];
        (row._scanIds as string[]).push(scan.id);
      } else {
        // 未匹配的SKU，收集起来准备新增行
        const existing = unmatchedScans.get(scan.sku);
        if (existing) {
          existing.totalQty += (scan.qty || 1);
          existing.scanIds.push(scan.id);
        } else {
          unmatchedScans.set(scan.sku, {
            scan,
            totalQty: scan.qty || 1,
            scanIds: [scan.id]
          });
        }
      }
    });

    // 为未匹配的SKU创建新行
    unmatchedScans.forEach(({ scan, totalQty, scanIds }, sku) => {
      const newRow = {
        _skuValue: sku,
        _originalQty: 0,
        _isHighlighted: false,
        _scanIds: scanIds,
        _isNewRow: true,
        scannedSkuDisplay: scan.raw_code,
        scannedQtyDisplay: totalQty,
        palletDisplay: scan.pallet_no || '',
        boxDisplay: scan.box_no || '',
        dockDisplay: '',
        operatorDisplay: scan.operator || ''
      } as ExcelRow;
      if (skuColumnKey) {
        newRow[skuColumnKey] = sku;
      }
      newData.push(newRow as typeof newData[0]);
    });

    setTableData(newData);
  };

  // 高亮行并滚动到可见位置 (Excel模式)
  const highlightRow = useCallback((row: ExcelRow) => {
    const rowIndex = tableData.findIndex(r => r._skuValue === row._skuValue);
    
    setTableData(prev => prev.map((r, idx) => ({
      ...r,
      _isHighlighted: idx === rowIndex
    })));
    
    // 延迟滚动以确保状态更新完成
    setTimeout(() => {
      const el = document.getElementById(`row-${rowIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // 添加闪烁效果
        el.classList.add('animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse'), 2000);
      }
    }, 100);
  }, [tableData]);

  // 高亮 MANUAL 模式的行 (SKU聚合表)
  const highlightManualRow = useCallback((sku: string) => {
    setTimeout(() => {
      const el = document.getElementById(`manual-row-${sku}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add('animate-pulse', 'bg-green-100', 'dark:bg-green-900');
        setTimeout(() => {
          el.classList.remove('animate-pulse', 'bg-green-100', 'dark:bg-green-900');
        }, 2000);
      }
    }, 100);
  }, []);

  // 播放提示音
  const playBeep = (type: "success" | "error") => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      if (type === "success") {
        osc.frequency.value = 800;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.value = 200;
        osc.type = "sawtooth";
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported
    }
  };

  // 处理Excel上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContainer) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: "array" });
      const json = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      if (json.length > 0) {
        const headers = json[0].map((h: string | number) => String(h));
        setOriginalHeaders(headers);
        
        // 识别SKU和Qty列
        const skuCol = headers.find((h: string) => /sku/i.test(h)) || headers[0];
        const qtyCol = headers.find((h: string) => /qty|quantity|数量/i.test(h));
        setSkuColumnKey(skuCol);
        setQtyColumnKey(qtyCol || "");

        const data: ExcelRow[] = json.slice(1).map((rowArr: (string | number)[]) => {
          const obj: ExcelRow = {
            _isHighlighted: false,
            scannedSkuDisplay: "",
            scannedQtyDisplay: 0,
            palletDisplay: "",
            boxDisplay: "",
            operatorDisplay: ""
          };
          headers.forEach((h, i) => obj[h] = rowArr[i]);
          obj._skuValue = String(obj[skuCol] || "").trim();
          obj._originalQty = qtyCol ? (parseInt(String(obj[qtyCol])) || 0) : 0;
          return obj;
        });

        setTableData(data);
        if (scans.length) recalcTable(scans);
        
        // 保存Excel数据到数据库（只保存原始数据，不保存显示状态）
        try {
          // 只保存原始Excel行数据，不包含显示状态字段
          const rawRows = json.slice(1).map((rowArr: (string | number)[]) => {
            const obj: Record<string, string | number | null | undefined> = {};
            headers.forEach((h, i) => obj[h] = rowArr[i]);
            return obj;
          });
          
          const excelDataToSave = {
            headers,
            rawRows,  // 只保存原始行数据
            skuColumnKey: skuCol,
            qtyColumnKey: qtyCol || "",
            fileName: file.name  // 保存文件名
          };
          
          await fetch('/api/admin/sku-scan', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'container',
              containerId: selectedContainer.id,
              excelData: excelDataToSave
            })
          });
          
          // 更新本地状态
          setSelectedContainer(prev => prev ? {
            ...prev,
            excelData: excelDataToSave
          } : null);
          
          // 更新containers列表中的对应项
          setContainers(prev => prev.map(c => 
            c.id === selectedContainer.id ? { ...c, excelData: excelDataToSave } : c
          ));
          
          setLastSaved(skuScan.autoSaved || '已自动保存');
        } catch (error) {
          console.error('Failed to save Excel data:', error);
        }
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // 导出结果（使用container的dockNo）
  const exportExcel = () => {
    // 构建表头（原始表头 + 扫码相关列）
    const headers = [...originalHeaders, 'Scanned SKU', 'Scanned Qty', 'Pallet No.', 'Box No.', 'Operator'];
    
    // 构建数据行
    const rows = tableData.map(row => {
      const rowData: unknown[] = [];
      originalHeaders.forEach(h => rowData.push(row[h]));
      rowData.push(row.scannedSkuDisplay);
      rowData.push(row.scannedQtyDisplay);
      rowData.push(row.palletDisplay);
      rowData.push(row.boxDisplay);
      rowData.push(row.operatorDisplay);
      return rowData;
    });
    
    // 构建完整的数组：DOCK No.行 + 空行 + 表头 + 数据
    const aoa = [
      ['DOCK No.', selectedContainer?.dockNo || ''],
      [], // 空行
      headers,
      ...rows
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result");
    XLSX.writeFile(wb, `${selectedContainer?.containerNo || "scan"}_Result.xlsx`);
  };

  // 导出差异
  const exportDiffExcel = () => {
    const diffRows = tableData.filter(row => 
      row.scannedQtyDisplay !== row._originalQty
    );
    if (diffRows.length === 0) {
      alert(skuScan.noDifference || "无差异！");
      return;
    }
    const data = diffRows.map(row => ({
      "SKU": row._skuValue,
      "Original Qty": row._originalQty,
      "Scanned Qty": row.scannedQtyDisplay,
      "Difference": (row.scannedQtyDisplay || 0) - (row._originalQty || 0),
      "Operator": row.operatorDisplay
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DiffReport");
    XLSX.writeFile(wb, `${selectedContainer?.containerNo || "scan"}_DiffReport.xlsx`);
  };

  // 创建容器
  const createContainer = async () => {
    if (!newContainerNo.trim()) return;
    
    try {
      setSaving(true);
      const res = await fetch("/api/admin/sku-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "container",
          containerNo: newContainerNo.trim(),
          description: newDescription.trim() || null,
          mode: newContainerMode
        })
      });
      
      if (res.ok) {
        setNewContainerNo("");
        setNewDescription("");
        setNewContainerMode("MANUAL");
        setIsCreateDialogOpen(false);
        fetchContainers();
      } else {
        const data = await res.json();
        alert(data.error || skuScan.createFailed || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create container:", error);
    } finally {
      setSaving(false);
    }
  };

  // 更新容器状态
  const updateContainerStatus = async (container: ScanContainer, status: "ACTIVE" | "COMPLETED" | "ARCHIVED") => {
    try {
      await fetch("/api/admin/sku-scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: container.id, status })
      });
      fetchContainers();
    } catch (error) {
      console.error("Failed to update container:", error);
    }
  };

  // 删除容器
  const deleteContainer = async (container: ScanContainer) => {
    if (!confirm(skuScan.confirmDelete || "确定删除该柜号及所有扫码记录？")) return;
    
    try {
      await fetch(`/api/admin/sku-scan?type=container&id=${container.id}`, {
        method: "DELETE"
      });
      if (selectedContainer?.id === container.id) {
        setSelectedContainer(null);
        setScans([]);
      }
      fetchContainers();
    } catch (error) {
      console.error("Failed to delete container:", error);
    }
  };

  // 更新容器的dockNo
  const updateContainerDockNo = async (dockNoValue: string) => {
    if (!selectedContainer) return;
    
    try {
      await fetch("/api/admin/sku-scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedContainer.id, 
          dockNo: dockNoValue 
        })
      });
      // 更新本地状态
      setSelectedContainer(prev => prev ? { ...prev, dockNo: dockNoValue } : null);
      setContainers(prev => prev.map(c => 
        c.id === selectedContainer.id ? { ...c, dockNo: dockNoValue } : c
      ));
    } catch (error) {
      console.error("Failed to update dockNo:", error);
    }
  };

  // 状态徽章
  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">{skuScan.statusActive || "进行中"}</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-500">{skuScan.statusCompleted || "已完成"}</Badge>;
      case "ARCHIVED":
        return <Badge variant="secondary">{skuScan.statusArchived || "已归档"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{skuScan.title || "扫码对账"}</h1>
          <p className="text-muted-foreground">{skuScan.description || "导入清单，扫码核对数量"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：容器列表 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{skuScan.containers || "柜号列表"}</CardTitle>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {skuScan.new || "新建"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{skuScan.newContainer || "新建柜号"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">{skuScan.containerNo || "柜号"} *</label>
                      <Input 
                        value={newContainerNo}
                        onChange={(e) => setNewContainerNo(e.target.value)}
                        placeholder="CONTAINER-001"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{skuScan.descriptionLabel || "描述"}</label>
                      <Input 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder={skuScan.optional || "可选"}
                      />
                    </div>
                    {/* 工作模式选择 */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">{skuScan.workMode || "工作模式"}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewContainerMode('MANUAL')}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            newContainerMode === 'MANUAL' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <ScanLine className="h-4 w-4 text-primary" />
                            <span className="font-medium">{skuScan.modeManual || "直接扫码"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {skuScan.modeManualDesc || "无需Excel，直接扫码统计"}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewContainerMode('EXCEL')}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            newContainerMode === 'EXCEL' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{skuScan.modeExcel || "Excel对账"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {skuScan.modeExcelDesc || "导入Excel进行对比"}
                          </p>
                        </button>
                      </div>
                    </div>
                    <Button onClick={createContainer} className="w-full" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {skuScan.create || "创建"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mb-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{skuScan.all || "全部"}</SelectItem>
                <SelectItem value="ACTIVE">{skuScan.statusActive || "进行中"}</SelectItem>
                <SelectItem value="COMPLETED">{skuScan.statusCompleted || "已完成"}</SelectItem>
                <SelectItem value="ARCHIVED">{skuScan.statusArchived || "已归档"}</SelectItem>
              </SelectContent>
            </Select>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {containers.map((container) => (
                  <div
                    key={container.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContainer?.id === container.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedContainer(container)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{container.containerNo}</div>
                        <div className={`text-xs flex items-center gap-2 ${selectedContainer?.id === container.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          <span>{skuScan.skuTypes_prefix || "已扫"} {container.scanCount} {skuScan.skuTypes || "种SKU"}</span>
                          {/* 模式标识 */}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1 py-0 ${
                              selectedContainer?.id === container.id 
                                ? 'border-primary-foreground/50 text-primary-foreground' 
                                : container.mode === 'MANUAL' 
                                  ? 'border-primary text-primary' 
                                  : 'border-green-600 text-green-600'
                            }`}
                          >
                            {container.mode === 'MANUAL' ? (
                              <><ScanLine className="h-2.5 w-2.5 mr-0.5" />{skuScan.modeManual || '扫码'}</>
                            ) : (
                              <><FileSpreadsheet className="h-2.5 w-2.5 mr-0.5" />Excel</>
                            )}
                          </Badge>
                        </div>
                      </div>
                      {statusBadge(container.status)}
                    </div>
                  </div>
                ))}
                {containers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {skuScan.noContainers || "暂无柜号"}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：扫码操作区 */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            {selectedContainer ? (
              <div className="space-y-4">
                {/* 操作栏 - 优化响应式布局 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pb-4 border-b">
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground font-medium block truncate">
                      1. {skuScan.containerNo || "柜号"}
                    </label>
                    <Input 
                      value={selectedContainer.containerNo} 
                      readOnly 
                      className="font-bold text-blue-600"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground font-medium block truncate">
                      2. {skuScan.operator || "操作人"}
                    </label>
                    <Input 
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="bg-yellow-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground font-medium block truncate">
                      3. {skuScan.dockNo || "DOCK No."}
                    </label>
                    <Input 
                      defaultValue={selectedContainer?.dockNo || ''}
                      key={selectedContainer?.id}  // 切换container时重置输入框
                      onBlur={(e) => updateContainerDockNo(e.target.value)}
                      placeholder="e.g. D1"
                      className="bg-orange-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground font-medium block truncate">
                      4. {skuScan.scanMode || "模式"}
                    </label>
                    <Select value={scanMode} onValueChange={(v) => setScanMode(v as "box" | "locate")}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">📦 {skuScan.modeBox || "整箱"}</SelectItem>
                        <SelectItem value="locate">🔍 {skuScan.modeLocate || "定位"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                    <label className="text-xs text-muted-foreground font-medium block truncate">
                      5. {skuScan.importExcel || "导入"}
                    </label>
                    {/* EXCEL模式：显示导入状态 */}
                    {selectedContainer.mode === 'EXCEL' && (selectedContainer.excelData as { fileName?: string })?.fileName ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md text-xs truncate">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          <span className="ml-1 text-muted-foreground">{(selectedContainer.excelData as { fileName?: string }).fileName}</span>
                        </div>
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </label>
                      </div>
                    ) : (
                      <Input 
                        type="file" 
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="text-xs"
                      />
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex gap-1 items-end">
                    {/* 手机扫码按钮 - 更明显的样式 */}
                    <Button 
                      onClick={() => setShowCameraScanner(!showCameraScanner)} 
                      size="sm" 
                      variant={showCameraScanner ? "default" : "secondary"}
                      className={`flex-1 ${showCameraScanner ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      <span>{showCameraScanner ? (skuScan.closeScanner || "关闭扫码") : (skuScan.cameraScan || "手机扫码")}</span>
                    </Button>
                    <Button onClick={exportExcel} size="sm" variant="outline" className="flex-1" disabled={!tableData.length}>
                      <Download className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{skuScan.export || "导出"}</span>
                    </Button>
                    <Button onClick={exportDiffExcel} size="sm" variant="destructive" className="flex-none" disabled={!tableData.length}>
                      <span>{skuScan.exportDiff || "差异"}</span>
                    </Button>
                  </div>
                </div>

                {/* 手机扫码区域 */}
                {showCameraScanner && (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        {skuScan.cameraScan || "手机/摄像头扫码"}
                      </h3>
                      <Button size="sm" variant="ghost" onClick={() => setShowCameraScanner(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Html5QrcodePlugin
                      fps={10}
                      qrbox={{ width: 300, height: 300 }}
                      qrCodeSuccessCallback={onCameraScanSuccess}
                    />
                  </div>
                )}

                {/* 状态栏 */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg flex flex-col md:flex-row justify-between items-center gap-2">
                  <div className="text-sm flex-1">
                    <span className="font-bold">{skuScan.lastScan || "最近扫描"}: </span>
                    <span className="font-bold text-red-600 text-lg">{lastScannedInfo}</span>
                    {saving && <Loader2 className="h-4 w-4 inline ml-2 animate-spin" />}
                    {lastSaved && (
                      <span className="ml-3 text-xs text-green-600 inline-flex items-center gap-1">
                        <Save className="h-3 w-3" />
                        {skuScan.autoSaved || "已自动保存"}: {lastSaved}
                      </span>
                    )}
                    {autoRefresh && (
                      <span className="ml-2 text-xs text-green-600 flex items-center gap-1 inline-flex">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        {skuScan.autoRefresh || "自动刷新"}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={autoRefresh ? "default" : "outline"}
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className="text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                      {skuScan.sync || "同步"}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedContainer.status === "ACTIVE" ? "default" : "outline"}
                      onClick={() => updateContainerStatus(selectedContainer, "ACTIVE")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {skuScan.statusActive || "进行中"}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedContainer.status === "COMPLETED" ? "default" : "outline"}
                      onClick={() => updateContainerStatus(selectedContainer, "COMPLETED")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {skuScan.statusCompleted || "完成"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateContainerStatus(selectedContainer, "ARCHIVED")}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      {skuScan.archive || "归档"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteContainer(selectedContainer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 数据表格 - 根据模式显示不同内容 */}
                {selectedContainer.mode === 'MANUAL' ? (
                  /* MANUAL模式：显示聚合的扫码统计表（3列） */
                  (() => {
                    // 聚合扫码记录：按SKU分组累计数量，同时保存关联的scanIds
                    const aggregatedData = scans.reduce((acc, scan) => {
                      const existing = acc.find(item => item.sku === scan.sku);
                      if (existing) {
                        existing.qty += scan.qty;
                        existing.scanIds.push(scan.id);
                        // 保留最新的pallet_no
                        if (scan.pallet_no) existing.pallet_no = scan.pallet_no;
                      } else {
                        acc.push({
                          sku: scan.sku,
                          qty: scan.qty,
                          pallet_no: scan.pallet_no || '',
                          scanIds: [scan.id]
                        });
                      }
                      return acc;
                    }, [] as Array<{sku: string; qty: number; pallet_no: string; scanIds: string[]}>);
                    
                    const totalSkus = aggregatedData.length;
                    const totalQty = aggregatedData.reduce((sum, item) => sum + item.qty, 0);
                    
                    // MANUAL模式导出功能（使用container的dockNo）
                    const exportManualExcel = () => {
                      // 构建表头
                      const headers = ['Scanned SKU', 'Scanned QTY', 'Pallet No'];
                      
                      // 构建数据行
                      const rows = aggregatedData.map(item => [
                        item.sku,
                        item.qty,
                        item.pallet_no
                      ]);
                      
                      // 构建完整的数组：DOCK No.行 + 空行 + 表头 + 数据
                      const aoa = [
                        ['DOCK No.', selectedContainer?.dockNo || ''],
                        [], // 空行
                        headers,
                        ...rows
                      ];
                      
                      const ws = XLSX.utils.aoa_to_sheet(aoa);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'ScanResult');
                      XLSX.writeFile(wb, `${selectedContainer.containerNo}_Manual_Result.xlsx`);
                    };
                    
                    return (
                      <div className="space-y-3">
                        {/* 统计信息 + 导出按钮 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ScanLine className="h-4 w-4" />
                              {(skuScan.totalSkus || "共 {count} 个SKU").replace('{count}', String(totalSkus))}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              {(skuScan.totalQty || "共 {count} 件").replace('{count}', String(totalQty))}
                            </span>
                          </div>
                          {aggregatedData.length > 0 && (
                            <Button size="sm" variant="outline" onClick={exportManualExcel}>
                              <Download className="h-4 w-4 mr-1" />
                              {skuScan.export || "导出"}
                            </Button>
                          )}
                        </div>
                        
                        {aggregatedData.length > 0 ? (
                          <div className="border rounded-lg overflow-x-auto">
                            <div className="max-h-[50vh] overflow-y-auto min-w-max">
                            <Table className="min-w-[600px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="whitespace-nowrap">{skuScan.scannedSku || "Scanned SKU"}</TableHead>
                                  <TableHead className="whitespace-nowrap text-center w-24">{skuScan.scannedQty || "Scanned QTY"}</TableHead>
                                  <TableHead className="whitespace-nowrap w-32">{skuScan.palletNo || "Pallet No"}</TableHead>
                                  <TableHead className="whitespace-nowrap w-16">{skuScan.action || "操作"}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {aggregatedData.map((item, idx) => (
                                  <TableRow 
                                    key={item.sku} 
                                    id={`manual-row-${item.sku}`}
                                    className="transition-colors"
                                  >
                                    <TableCell className="font-mono font-semibold">{item.sku}</TableCell>
                                    <TableCell className="text-center p-1">
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={item.qty}
                                        onChange={async (e) => {
                                          const newValue = e.target.value.replace(/[^0-9]/g, '');
                                          const newQty = parseInt(newValue) || 0;
                                          if (newQty === item.qty) return;
                                          
                                          // 确认弹窗
                                          if (!confirm(skuScan.confirmModifyQty || `确定将数量从 ${item.qty} 修改为 ${newQty} 吗？`)) {
                                            return;
                                          }
                                          
                                          // 计算差值，只更新第一条记录的qty
                                          const skuScans = scans.filter(s => s.sku === item.sku);
                                          if (skuScans.length > 0) {
                                            const firstScan = skuScans[0];
                                            const otherScansQty = skuScans.slice(1).reduce((sum, s) => sum + s.qty, 0);
                                            const newFirstQty = newQty - otherScansQty;
                                            
                                            await fetch('/api/admin/sku-scan', {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                type: 'updateScan',
                                                scanId: firstScan.id,
                                                qty: Math.max(1, newFirstQty)
                                              })
                                            });
                                            
                                            // 更新本地状态
                                            setScans(prev => prev.map(s => 
                                              s.id === firstScan.id ? { ...s, qty: Math.max(1, newFirstQty) } : s
                                            ));
                                          }
                                        }}
                                        className="w-16 h-8 text-center font-bold text-lg"
                                      />
                                    </TableCell>
                                    <TableCell className="p-1">
                                      <Input
                                        type="text"
                                        defaultValue={item.pallet_no}
                                        onChange={(e) => {
                                          // 只更新本地状态，不发送API
                                          const newPallet = e.target.value;
                                          setScans(prev => prev.map(s => 
                                            s.sku === item.sku ? { ...s, pallet_no: newPallet } : s
                                          ));
                                        }}
                                        onBlur={async (e) => {
                                          // 失焦时保存到数据库
                                          const newPallet = e.target.value;
                                          const skuScans = scans.filter(s => s.sku === item.sku);
                                          for (const scan of skuScans) {
                                            await fetch('/api/admin/sku-scan', {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                type: 'updateScan',
                                                scanId: scan.id,
                                                pallet_no: newPallet
                                              })
                                            });
                                          }
                                        }}
                                        placeholder={skuScan.palletHint || "1,2,3"}
                                        className="w-28 h-8 text-sm"
                                      />
                                    </TableCell>
                                    <TableCell className="p-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={async () => {
                                          if (!confirm(skuScan.deleteScanConfirm || '确定删除该SKU的所有扫码记录吗？')) return;
                                          // 删除所有该SKU的扫码记录
                                          const skuScans = scans.filter(s => s.sku === item.sku);
                                          for (const scan of skuScans) {
                                            await fetch('/api/admin/sku-scan', {
                                              method: 'DELETE',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ type: 'scan', id: scan.id })
                                            });
                                          }
                                          setScans(prev => prev.filter(s => s.sku !== item.sku));
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            </div>
                          </div>
                        ) : (
                          <div className="border rounded-lg p-12 text-center text-muted-foreground">
                            <ScanLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{skuScan.manualScanHint || "扫码开始统计，SKU自动累加"}</p>
                            <p className="text-xs mt-2">{skuScan.noScanRecords || "暂无扫码记录"}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  /* EXCEL模式：显示原有的Excel对比表 */
                  tableData.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
                      <div className="max-h-[50vh] overflow-y-auto min-w-max">
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow>
                            {originalHeaders.map(h => (
                              <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                            ))}
                            <TableHead className="bg-blue-100 dark:bg-blue-900 whitespace-nowrap">Scanned SKU</TableHead>
                            <TableHead className="bg-blue-100 dark:bg-blue-900 whitespace-nowrap w-20">Qty</TableHead>
                            <TableHead className="bg-blue-100 dark:bg-blue-900 whitespace-nowrap">Pallet</TableHead>
                            <TableHead className="bg-blue-100 dark:bg-blue-900 whitespace-nowrap">Box</TableHead>
                            <TableHead className="bg-blue-100 dark:bg-blue-900 whitespace-nowrap">Operator</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.map((row, idx) => (
                            <TableRow 
                              key={idx} 
                              id={`row-${idx}`}
                              className={row._isHighlighted ? "bg-green-100 dark:bg-green-900" : ""}
                            >
                              {originalHeaders.map(h => (
                                <TableCell key={h} className="whitespace-nowrap">{String(row[h] ?? "")}</TableCell>
                              ))}
                              <TableCell className="p-1">
                                <Input
                                  type="text"
                                  defaultValue={row.scannedSkuDisplay || ''}
                                  onBlur={(e) => {
                                    const newValue = e.target.value.trim();
                                    const originalValue = row.scannedSkuDisplay || '';
                                    
                                    // 保护：已填充的SKU不允许删除为空
                                    if (originalValue && !newValue) {
                                      alert(skuScan.cannotClearSku || "❗ 无法清空已扫码的SKU\n\n如需修改，请输入新的SKU值");
                                      e.target.value = originalValue;  // 恢复原值
                                      return;
                                    }
                                    
                                    if (newValue && newValue !== originalValue) {
                                      handleManualSkuInput(idx, newValue);
                                    }
                                  }}
                                  placeholder="手动输入"
                                  className="min-w-[120px] font-bold text-blue-700 dark:text-blue-300 h-8"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={row.scannedQtyDisplay || ''}
                                  onChange={(e) => updateRowField(idx, 'scannedQtyDisplay', e.target.value)}
                                  className="w-16 text-center font-bold text-blue-700 dark:text-blue-300 h-8"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="text"
                                  value={row.palletDisplay || ''}
                                  onChange={(e) => updateRowField(idx, 'palletDisplay', e.target.value)}
                                  placeholder="-"
                                  className="w-20 h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={row.boxDisplay || ''}
                                  onChange={(e) => updateRowField(idx, 'boxDisplay', e.target.value)}
                                  placeholder="-"
                                  className="w-20 h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">{row.operatorDisplay}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-12 text-center text-muted-foreground">
                      <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{skuScan.uploadHint || "请上传Excel清单开始扫码对账"}</p>
                      <p className="text-xs mt-2">{skuScan.uploadHint2 || "支持 .xlsx, .xls, .csv 格式"}</p>
                    </div>
                  )  
                )}

                {/* 底部统计栏 */}
                {scans.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {/* 已扫总数 */}
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md px-3 py-2 border">
                      <span className="text-muted-foreground text-xs">{skuScan.totalScannedQty || "已扫总数"}</span>
                      <span className="font-bold text-blue-600 text-lg ml-2">
                        {scans.reduce((sum, s) => sum + (s.qty || 1), 0)}
                      </span>
                    </div>
                    {/* 当前最大Pallet */}
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md px-3 py-2 border">
                      <span className="text-muted-foreground text-xs">{skuScan.currentMaxPallet || "当前最大Pallet"}</span>
                      <span className="font-bold text-orange-600 text-lg ml-2">
                        {(() => {
                          let maxNum = 0;
                          const allPallets = new Set<string>();
                          scans.forEach(s => {
                            if (!s.pallet_no) return;
                            const parts = s.pallet_no.split(/[,/;、\s]+/).filter(Boolean);
                            parts.forEach(p => {
                              const trimmed = p.trim();
                              if (trimmed) {
                                allPallets.add(trimmed);
                                const num = parseInt(trimmed);
                                if (!isNaN(num) && num > maxNum) maxNum = num;
                              }
                            });
                          });
                          if (maxNum > 0) return String(maxNum);
                          if (allPallets.size > 0) return Array.from(allPallets).pop() || '-';
                          return '-';
                        })()}
                      </span>
                    </div>
                    {/* 原始数量总数 */}
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md px-3 py-2 border">
                      <span className="text-muted-foreground text-xs">{skuScan.originalTotalQty || "原始数量总数"}</span>
                      <span className="font-bold text-green-600 text-lg ml-2">
                        {(() => {
                          if (selectedContainer?.mode === 'EXCEL' && tableData.length > 0 && originalHeaders.length > 0) {
                            const qtyColKey = originalHeaders.find(h => 
                              /qty|quantity|数量/i.test(h)
                            );
                            if (qtyColKey) {
                              return tableData.reduce((sum, row) => {
                                const val = parseInt(String(row[qtyColKey] ?? 0));
                                return sum + (isNaN(val) ? 0 : val);
                              }, 0);
                            }
                          }
                          return '-';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{skuScan.selectContainer || "请从左侧选择或创建柜号"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
