"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Loader2, Camera, RefreshCw, Video, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Html5QrcodePluginProps {
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  qrCodeSuccessCallback: (decodedText: string) => void;
  qrCodeErrorCallback?: (error: string) => void;
}

// 支持的条码/二维码格式
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

export default function Html5QrcodePlugin({
  fps = 20,
  qrbox = { width: 250, height: 250 },
  disableFlip = false,
  qrCodeSuccessCallback,
  qrCodeErrorCallback,
}: Html5QrcodePluginProps) {
  const containerId = "html5-qrcode-container";
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTime = useRef(0);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  
  const [status, setStatus] = useState<'idle' | 'requesting' | 'running' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // 停止扫描器
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // 忽略
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // 忽略
      }
      scannerRef.current = null;
    }
  }, []);

  // 启动扫描器
  const startScanner = useCallback(async (cameraIndex?: number) => {
    if (!mountedRef.current || initializingRef.current) return;
    initializingRef.current = true;
    
    setStatus('requesting');
    setErrorMessage(null);
    setDebugInfo('正在获取摄像头权限...');

    // 先停止已有的扫描器
    await stopScanner();
    
    try {
      // 第一步：获取摄像头权限
      setDebugInfo('请求摄像头权限...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        // 立即释放，只是为了获取权限
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        console.error('Permission error:', permErr);
        setStatus('error');
        if (permErr.name === 'NotAllowedError') {
          setErrorMessage('摄像头权限被拒绝。请在浏览器设置中允许访问摄像头。');
        } else if (permErr.name === 'NotFoundError') {
          setErrorMessage('未检测到摄像头设备。');
        } else {
          setErrorMessage(`摄像头访问失败: ${permErr.message}`);
        }
        setDebugInfo(`权限错误: ${permErr.name}`);
        initializingRef.current = false;
        return;
      }

      // 第二步：获取摄像头列表
      setDebugInfo('正在枚举摄像头设备...');
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error('未找到可用的摄像头设备');
      }
      
      setCameras(devices);
      console.log('可用摄像头:', devices);
      setDebugInfo(`找到 ${devices.length} 个摄像头`);
      
      // 确定要使用的摄像头索引
      let camIdx = cameraIndex ?? 0;
      // 尝试找后置摄像头
      if (cameraIndex === undefined) {
        const backIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.includes('后置')
        );
        if (backIdx >= 0) camIdx = backIdx;
      }
      
      if (camIdx >= devices.length) camIdx = 0;
      setSelectedCameraIndex(camIdx);
      
      const targetCamera = devices[camIdx];
      setDebugInfo(`启动摄像头: ${targetCamera.label}`);
      console.log('使用摄像头:', targetCamera);
      
      // 第三步：创建并启动扫描器
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        targetCamera.id,
        {
          fps,
          qrbox,
          disableFlip,
        },
        (decodedText: string) => {
          const now = Date.now();
          if (now - lastScanTime.current > 1500) {
            lastScanTime.current = now;
            qrCodeSuccessCallback(decodedText);
          }
        },
        () => {
          // 扫描中的错误，不处理
        }
      );
      
      if (!mountedRef.current) {
        await stopScanner();
        initializingRef.current = false;
        return;
      }
      
      setStatus('running');
      setDebugInfo('扫描器已就绪');
      
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      if (!mountedRef.current) {
        initializingRef.current = false;
        return;
      }
      
      setStatus('error');
      setErrorMessage(err.message || '启动扫描器失败');
      setDebugInfo(`错误: ${err.message}`);
    }
    
    initializingRef.current = false;
  }, [fps, qrbox, disableFlip, qrCodeSuccessCallback, stopScanner]);

  // 组件加载/卸载
  useEffect(() => {
    mountedRef.current = true;
    initializingRef.current = false;
    
    // 延迟启动
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        startScanner();
      }
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  // 重试
  const handleRetry = useCallback(() => {
    startScanner(selectedCameraIndex);
  }, [startScanner, selectedCameraIndex]);

  // 切换摄像头
  const handleSwitchCamera = useCallback(() => {
    if (cameras.length <= 1) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    startScanner(nextIndex);
  }, [cameras.length, selectedCameraIndex, startScanner]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 扫描器容器 - 始终存在 */}
      <div 
        id={containerId} 
        className="rounded-lg overflow-hidden bg-black w-full"
        style={{ 
          minHeight: '240px',
          visibility: status === 'running' ? 'visible' : 'hidden',
          position: status === 'running' ? 'relative' : 'absolute',
          left: status === 'running' ? 'auto' : '-9999px',
        }}
      />
      
      {status === 'requesting' && (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg" style={{ minHeight: '240px' }}>
          <Loader2 className="h-10 w-10 animate-spin mb-3 text-primary" />
          <p className="text-sm font-medium">正在初始化摄像头...</p>
          <p className="text-xs text-muted-foreground mt-1">请在弹出的权限请求中点击"允许"</p>
          <p className="text-xs text-blue-500 mt-2">{debugInfo}</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-center py-6 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800" style={{ minHeight: '240px' }}>
          <Camera className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">摄像头访问失败</p>
          <p className="text-sm text-red-500 dark:text-red-400 mb-4 px-4">{errorMessage}</p>
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
          <p className="text-xs text-muted-foreground mt-4 px-4">
            提示：在浏览器地址栏左侧点击"网站信息"图标 &gt; 摄像头 &gt; 允许
          </p>
          <p className="text-xs text-blue-500 mt-2">{debugInfo}</p>
        </div>
      )}
      
      {status === 'running' && (
        <div className="mt-3 space-y-2">
          <div className="text-center">
            <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-2">
              <Video className="h-4 w-4" />
              摄像头已开启，请将码对准扫描框
            </p>
            <p className="text-xs text-muted-foreground">
              支持: QR码, Code128, Code39, EAN, UPC 等
            </p>
          </div>
          
          {/* 摄像头切换按钮 */}
          {cameras.length > 1 && (
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwitchCamera}
                className="text-xs"
              >
                <SwitchCamera className="h-4 w-4 mr-1" />
                切换摄像头 ({selectedCameraIndex + 1}/{cameras.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
