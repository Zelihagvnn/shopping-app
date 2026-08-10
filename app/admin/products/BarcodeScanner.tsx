"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import styles from "./barcode-scanner.module.css";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
}

export default function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  //aynı barkodun art arda birkaç kez işlenmesini önler
  const detectedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [lastBarcode, setLastBarcode] = useState("");

  //fonksiyonu güncel tutar
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const releaseCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }
  };

  const stopCamera = () => {
    releaseCamera();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    let cancelled = false;
    const video = videoRef.current;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 80,
    });

    const startReader = async () => {
      return reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        video,
        (result) => {
          const barcode = result?.getText().trim();

          if (!barcode || detectedRef.current) return;

          detectedRef.current = true;
          setLastBarcode(barcode);
          navigator.vibrate?.(120);
          releaseCamera();
          setIsOpen(false);
          onDetectedRef.current(barcode);
        },
      );
    };

    void startReader()
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
      })
      .catch((cameraError) => {
        console.error("Kamera açılamadı:", cameraError);
        releaseCamera();
        setIsOpen(false);
        setError(
          cameraError instanceof DOMException &&
            (cameraError.name === "NotAllowedError" ||
              cameraError.name === "PermissionDismissedError")
            ? "Kamera izni verilmedi. Adres çubuğundaki kamera simgesinden izni açıp tekrar deneyin."
            : "Kamera açılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol edin.",
        );
      });

    return () => {
      cancelled = true;
      releaseCamera();
    };
  }, [isOpen]);

  const startCamera = () => {
    setError("");
    setLastBarcode("");
    detectedRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Kamera erişimi için siteyi HTTPS üzerinden açmalısınız.");
      return;
    }

    setIsOpen(true);
  };

  return (
    <div className={styles.scanner}>
      <button type="button" className={styles.openButton} onClick={startCamera}>
        Kamerayla Barkod Tara
      </button>

      {error && <p className={styles.error}>{error}</p>}
      {lastBarcode && (
        <p className={styles.success}>Barkod okundu: {lastBarcode}</p>
      )}

      {isOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3>Barkodu kameraya gösterin</h3>
                <p>Barkodu çerçevenin ortasında ve aydınlıkta tutun.</p>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                aria-label="Kamerayı kapat"
              >
                ×
              </button>
            </div>

            <div className={styles.cameraArea}>
              <video ref={videoRef} muted playsInline />
              <div className={styles.guide} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
