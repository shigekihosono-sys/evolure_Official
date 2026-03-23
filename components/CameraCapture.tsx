import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, Video, Circle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaCaptured: (mediaDataUrl: string) => void;
  mode?: 'photo' | 'video';
}

const RECORDING_DURATION = 5000;

export const CameraCapture: React.FC<CameraCaptureProps> = ({ isOpen, onClose, onMediaCaptured, mode = 'photo' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderMimeTypeRef = useRef<string>('');

  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(RECORDING_DURATION / 1000);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
  }, []);

  const resetState = useCallback(() => {
      stopCamera();
      setCapturedMedia(null);
      setError(null);
      setIsRecording(false);
      setIsProcessing(false);
      if(timerRef.current) clearInterval(timerRef.current);
      setCountdown(RECORDING_DURATION / 1000);
      recordedChunksRef.current = [];
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements?.[0];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        firstElement?.focus();
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    if (capturedMedia) {
      stopCamera();
      return;
    }
    
    let isCancelled = false;

    const startCamera = async () => {
      stopCamera(); 
      try {
        setError(null);
        console.log("[Step 1] Camera requested");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode, 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 } 
          },
          audio: false
        });

        if (!isCancelled) {
          streamRef.current = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.onloadedmetadata = () => {
               if(!isCancelled && videoRef.current) {
                   videoRef.current.play().then(() => {
                       if (!isCancelled) {
                           setIsStreamActive(true);
                           console.log("[Step 2] Camera stream active");
                       }
                   }).catch(err => {
                       console.error("Video play failed:", err);
                       if(!isCancelled) setError('ビデオの再生に失敗しました。');
                   });
               }
            };
          }
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Camera access error:', err);
           if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError') {
              setError('カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。');
            } else {
              setError('カメラの起動に失敗しました。');
            }
          } else {
            setError('カメラの起動中に不明なエラーが発生しました。');
          }
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, capturedMedia, facingMode, stopCamera, resetState]);


  const handleStartRecording = () => {
      if (!videoRef.current || !streamRef.current || isRecording) {
          console.warn("Cannot start recording: Stream not ready or already recording.");
          return;
      }

      console.log("[Step 3] Starting recording setup...");

      // Chrome (Mac) 最適化: video/webm;codecs=vp9 を優先
      // MIMEタイプのサポート確認を厳格化
      const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm',
          'video/mp4'
      ];
      
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!mimeType) {
           console.error("No supported MIME type found.");
           setError('このブラウザはビデオ録画をサポートしていません。');
           return;
      }

      setIsRecording(true);
      recordedChunksRef.current = []; // チャンク配列を初期化

      try {
          const options: MediaRecorderOptions = { 
              mimeType,
              videoBitsPerSecond: 2500000 // 2.5 Mbps
          };
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
          recorderMimeTypeRef.current = mimeType;
          console.log(`[Step 3.1] MediaRecorder initialized with MIME type: ${mimeType}`);
      } catch (e) {
          console.warn('MediaRecorder init with options failed, retrying without options:', e);
          try {
              mediaRecorderRef.current = new MediaRecorder(streamRef.current);
              recorderMimeTypeRef.current = mediaRecorderRef.current.mimeType;
          } catch (e2) {
              console.error('MediaRecorder init error:', e2);
              setError('録画の開始に失敗しました。');
              setIsRecording(false);
              return;
          }
      }
      
      // データ収集ハンドラ：タイムスライスにより定期的に呼ばれる
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`[Step 5] Data available: ${event.data.size} bytes`);
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstart = () => {
          console.log("[Step 4] MediaRecorder started recording");
      };
      
      mediaRecorderRef.current.onerror = (e) => {
          console.error("[Error] MediaRecorder error:", e);
          setError("録画中にエラーが発生しました。");
          setIsRecording(false);
          setIsProcessing(false);
      };

      // 録画停止時の処理：ここでBlobを生成
      mediaRecorderRef.current.onstop = () => {
        console.log(`[Step 6] Recording stopped. Total chunks: ${recordedChunksRef.current.length}`);
        
        // チャンク結合
        const blob = new Blob(recordedChunksRef.current, { 
            type: recorderMimeTypeRef.current 
        });
        
        console.log(`[Step 7] Blob created. Size: ${blob.size} bytes, Type: ${blob.type}`);

        // 厳格なサイズチェック
        if (blob.size === 0) {
            console.error("[Error] Blob size is 0. Recording failed.");
            setError('録画データが正常に生成されませんでした（サイズ0）。');
            setIsRecording(false);
            setIsProcessing(false);
            if(timerRef.current) clearInterval(timerRef.current);
            return;
        }

        // Base64変換
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                console.log(`[Step 8] Conversion to Base64 complete. Length: ${reader.result.length}`);
                setCapturedMedia(reader.result);
                // 完全に処理が終わってからProcessingを解除
                setIsProcessing(false);
            } else {
                console.error("FileReader result is not a string.");
                setError('録画データの処理に失敗しました。');
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            console.error("FileReader error.");
            setError('録画データの読み込みに失敗しました。');
            setIsProcessing(false);
        };
        
        reader.readAsDataURL(blob);
        setIsRecording(false);
        if(timerRef.current) clearInterval(timerRef.current);
        setCountdown(RECORDING_DURATION / 1000);
      };
      
      // 【重要】start(1000) で1秒ごとにデータをフラッシュさせる
      // これによりstop時のデータ欠損リスクを最小化する
      mediaRecorderRef.current.start(1000);
      
      setCountdown(RECORDING_DURATION / 1000);
      timerRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          console.log("[Step 5.5] Stopping recorder automatically...");
          // stop前にUIをロック
          setIsProcessing(true); 
          mediaRecorderRef.current.stop();
        }
      }, RECORDING_DURATION);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && isStreamActive) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedMedia(dataUrl);
      }
    }
  };
  
  const handleRetake = () => {
    setCapturedMedia(null);
    setError(null);
    setIsProcessing(false);
  };
  
  const handleUseMedia = () => {
    if(capturedMedia && !isProcessing) {
        console.log("[Step 9] User confirmed media usage.");
        onMediaCaptured(capturedMedia);
        onClose();
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) {
    return null;
  }

  const isVideoPreview = capturedMedia && mode === 'video';

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label="カメラ撮影" className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 w-full px-4 flex justify-between z-20">
         {!capturedMedia && !isRecording && !isProcessing && (
            <button aria-label="カメラを切り替え" onClick={handleSwitchCamera} className="p-3 bg-black/20 text-white rounded-full hover:bg-black/30 transition">
              <RefreshCw size={28} />
            </button>
         )}
         <div className="flex-grow"></div>
         {!isRecording && !isProcessing && (
            <button aria-label="閉じる" onClick={onClose} className="p-3 bg-black/20 text-white rounded-full hover:bg-black/30 transition">
             <X size={28} />
            </button>
         )}
      </div>

      {isRecording && (
        <div className="absolute top-20 text-center text-white bg-black/50 p-3 rounded-lg z-20" aria-live="assertive">
          <p className="font-semibold">ゆっくりと顔を左右に振ってください</p>
          <p className="text-4xl font-bold mt-1">{countdown}</p>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
            <Loader2 size={48} className="text-white animate-spin mb-4" />
            <p className="text-white font-bold text-lg">ビデオを保存中...</p>
            <p className="text-white/80 text-sm mt-2">そのままお待ちください</p>
        </div>
      )}

      {error && (
        <div role="alert" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-center p-8 bg-red-800/90 rounded-lg max-w-sm z-30 shadow-lg">
          <p className="font-bold text-lg mb-2">エラー</p>
          <p>{error}</p>
          <button onClick={handleRetake} className="mt-4 bg-white text-red-800 px-4 py-2 rounded font-bold text-sm">再試行</button>
        </div>
      )}

      <div className="relative w-full h-full bg-black">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''} ${capturedMedia || error ? 'opacity-0' : 'opacity-100'}`}
        />
        
        {capturedMedia && (
            isVideoPreview ? (
              <video src={capturedMedia} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <img src={capturedMedia} alt="撮影された写真" className="absolute inset-0 w-full h-full object-contain" />
            )
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8">
        {capturedMedia ? (
          <>
            <button 
                onClick={handleRetake} 
                disabled={isProcessing}
                className="p-4 bg-black/40 text-white rounded-full hover:bg-black/50 transition flex flex-col items-center gap-1 text-center backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <RefreshCw size={32}/>
                <span className="text-xs font-medium">再撮影</span>
            </button>
            <button 
                onClick={handleUseMedia} 
                disabled={isProcessing}
                className="p-6 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition scale-110 flex flex-col items-center gap-1 text-center shadow-lg shadow-blue-600/30 disabled:bg-slate-500 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed"
            >
                {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <Check size={32} />}
                <span className="text-xs font-medium">使用する</span>
            </button>
          </>
        ) : (
           <button 
                onClick={mode === 'video' ? handleStartRecording : handleCapturePhoto}
                disabled={isProcessing || (mode === 'video' && isRecording)}
                className={`p-1 rounded-full transition shadow-lg flex items-center justify-center transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${mode === 'video' && isRecording ? 'bg-transparent' : 'bg-white'}`}
            >
                {mode === 'video' ? (
                   isRecording ? (
                       <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                           <div className="w-8 h-8 bg-red-500 rounded-sm animate-pulse" />
                       </div>
                   ) : (
                       <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-red-600">
                            <Video size={32} className="text-white ml-1" />
                       </div>
                   )
                ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white">
                         <div className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white">
                            <Circle size={60} className="text-slate-200 fill-slate-200" />
                         </div>
                    </div>
                )}
            </button>
        )}
      </div>
    </div>
  );
};