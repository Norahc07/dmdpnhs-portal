"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import {
  removeProfileAvatar,
  uploadProfileAvatar,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initialsFrom(profile) {
  const a = (profile?.first_name || "?").slice(0, 1);
  const b = (profile?.last_name || "?").slice(0, 1);
  return `${a}${b}`.toUpperCase();
}

export function ProfilePicturePicker({
  profile,
  avatarUrl,
  onAvatarChange,
  className,
}) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState(avatarUrl || null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPreview(avatarUrl || null);
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function openCamera() {
    setError("");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("Camera access was denied or is unavailable on this device.");
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
  }

  function captureSelfie() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture photo. Try again.");
          return;
        }
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        closeCamera();
        uploadFile(file);
      },
      "image/jpeg",
      0.92
    );
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadFile(file);
  }

  function uploadFile(file) {
    setError("");
    setMessage("");
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      const result = await uploadProfileAvatar(fd);
      if (result?.error) {
        setError(result.error);
        setPreview(avatarUrl || null);
        return;
      }
      setPreview(result.avatarUrl);
      setMessage("Profile photo saved.");
      onAvatarChange?.(result.avatarUrl);
    });
  }

  function onRemove() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await removeProfileAvatar();
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setMessage("Profile photo removed.");
      onAvatarChange?.(null);
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative size-28 overflow-hidden rounded-2xl border border-[#800000]/20 bg-[#800000]/5 shadow-sm sm:size-32">
          {preview ? (
            <Image
              src={preview}
              alt="Profile photo"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-(family-name:--font-montserrat) text-3xl font-bold text-[#800000]">
              {initialsFrom(profile)}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Upload photo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={openCamera}
          >
            <Camera className="size-4" />
            Take selfie
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={onRemove}
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WebP, or GIF · max 5 MB. Use a clear face photo for your portal
        profile.
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-heading text-sm font-bold text-[#3d1212]">
                Take a selfie
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex justify-end gap-2 p-4">
              <Button type="button" variant="outline" onClick={closeCamera}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#800000] hover:bg-[#6a0000]"
                onClick={captureSelfie}
                disabled={pending}
              >
                <Camera className="size-4" />
                Capture
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
