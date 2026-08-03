"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, FlipHorizontal2, ImagePlus, Trash2, X } from "lucide-react";
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
  compact = false,
}) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState(avatarUrl || null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mirrored, setMirrored] = useState(true);
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

    // Match capture to the preview: flip horizontally when mirror is on
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={onFileChange}
    />
  );

  const cameraModal = cameraOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d1212]/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-[#800000]/10 px-4 py-3">
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
            className={cn(
              "h-full w-full object-cover",
              mirrored && "-scale-x-100"
            )}
          />
          <div className="absolute top-3 right-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn(
                "border border-white/20 bg-black/55 text-white shadow-sm backdrop-blur-sm hover:bg-black/70 hover:text-white",
                mirrored && "ring-1 ring-[#ffd700]/70"
              )}
              onClick={() => setMirrored((v) => !v)}
              aria-pressed={mirrored}
              aria-label={mirrored ? "Turn mirror off" : "Turn mirror on"}
            >
              <FlipHorizontal2 className="size-4" />
              {mirrored ? "Mirror on" : "Mirror off"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <p className="text-[11px] text-muted-foreground">
            {mirrored
              ? "Preview is mirrored like a bathroom mirror."
              : "Preview matches the real camera orientation."}
          </p>
          <div className="flex gap-2">
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
    </div>
  ) : null;

  // Compact / profile-panel layout: centered, modern vertical stack
  if (compact) {
    return (
      <div className={cn("flex w-full flex-col items-center", className)}>
        {fileInput}

        <div className="relative mb-6">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(128,0,0,0.16),transparent_65%)]"
          />
          <div className="relative size-48 overflow-hidden rounded-full border-[4px] border-white bg-[#f3ebe8] shadow-[0_12px_32px_-12px_rgba(61,18,18,0.45)] ring-1 ring-[#800000]/15 sm:size-56">
            {preview ? (
              <Image
                src={preview}
                alt="Profile photo"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#800000]/10 to-[#800000]/5 font-(family-name:--font-montserrat) text-5xl font-bold tracking-wide text-[#800000] sm:text-6xl">
                {initialsFrom(profile)}
              </div>
            )}
            {pending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#3d1212]/35 text-sm font-medium text-white backdrop-blur-[1px]">
                Saving…
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex w-full max-w-[240px] flex-col gap-2">
          <Button
            type="button"
            disabled={pending}
            className="w-full bg-[#800000] hover:bg-[#6a0000]"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Upload photo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="w-full border-[#800000]/20"
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
              className="w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Trash2 className="size-4" />
              Remove photo
            </Button>
          ) : null}
        </div>

        <p className="mt-4 max-w-[240px] text-center text-[11px] leading-relaxed text-muted-foreground">
          JPG, PNG, WebP, or GIF · max 5 MB
        </p>

        {error ? (
          <p className="mt-3 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
            {message}
          </p>
        ) : null}

        {cameraModal}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {fileInput}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
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

      {cameraModal}
    </div>
  );
}
