"use client";

import { Camera, ImagePlus, Pencil, Save, Trash2, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProspectImage,
  registerProspectImage,
  updateProspectImage
} from "@/app/prospects/[id]/actions";
import { createClient } from "@/lib/supabase/client";

type ProspectImageItem = {
  id: string;
  fileName: string;
  storagePath: string;
  originalFileName: string | null;
  notes: string | null;
  createdAt: string;
  signedUrl: string | null;
};

const imageBucket = "prospect-images";
const maxImageSize = 10 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export function ProspectImagesPanel({
  canModify,
  companyName,
  images,
  prospectId
}: {
  canModify: boolean;
  companyName: string;
  images: ProspectImageItem[];
  prospectId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get("image");

    if (!(image instanceof File) || image.size === 0) {
      setMessage({ error: "Selectionnez une image." });
      return;
    }

    const extension = getImageExtension(image);
    const contentType = image.type || imageTypes[extension];

    if (!extension || !contentType) {
      setMessage({ error: "Format non accepte. Utilisez JPG, PNG, WEBP, GIF, HEIC ou HEIF." });
      return;
    }

    if (image.size > maxImageSize) {
      setMessage({ error: "L'image ne doit pas depasser 10 Mo." });
      return;
    }

    setPending(true);
    const fileName = `${slugifyFilePart(companyName)}_${formatFileTimestamp(new Date())}.${extension}`;
    const storagePath = `${prospectId}/${fileName}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(imageBucket)
      .upload(storagePath, image, { contentType, upsert: false });

    if (uploadError) {
      setPending(false);
      const bucketMissing = /bucket not found/i.test(uploadError.message);
      setMessage({
        error: bucketMissing
          ? "Le stockage des images n'est pas encore active dans Supabase. Un administrateur doit appliquer la migration 015_prospect_images.sql."
          : `Envoi impossible vers Supabase (${uploadError.message}).`
      });
      return;
    }

    const metadata = new FormData();
    metadata.set("prospect_id", prospectId);
    metadata.set("storage_path", storagePath);
    metadata.set("file_name", fileName);
    metadata.set("original_file_name", image.name);
    metadata.set("content_type", contentType);
    metadata.set("file_size", String(image.size));
    metadata.set("notes", String(data.get("notes") ?? ""));

    const result = await registerProspectImage(metadata);

    if (result?.error) {
      await supabase.storage.from(imageBucket).remove([storagePath]);
      setMessage({ error: result.error });
    } else {
      formRef.current?.reset();
      setMessage({ success: result?.success ?? "Image ajoutee a la fiche prospect." });
      router.refresh();
    }

    setPending(false);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Images</h2>
          <p className="mt-1 text-sm text-muted">
            Photos terrain, croquis, plans ou visuels rattaches au prospect.
          </p>
        </div>
        <span className="rounded-md bg-background px-3 py-1 text-sm font-medium text-muted">
          {images.length} image(s)
        </span>
      </div>

      {canModify ? (
        <form
          className="mt-5 grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Photo ou image</span>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
              className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              disabled={pending}
              name="image"
              required
              type="file"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Note</span>
            <input
              className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              disabled={pending}
              name="notes"
              placeholder="Ex : photo showroom, detail facade..."
            />
          </label>
          <button
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 md:mt-6"
            disabled={pending}
            type="submit"
          >
            <Camera size={17} />
            {pending ? "Envoi..." : "Ajouter"}
          </button>
          {message.error ? (
            <p className="text-sm font-medium text-red-600 md:col-span-3">{message.error}</p>
          ) : null}
          {message.success ? (
            <p className="text-sm font-medium text-emerald-700 md:col-span-3">{message.success}</p>
          ) : null}
        </form>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.length ? (
          images.map((image) => (
            <ProspectImageCard
              canModify={canModify}
              companyName={companyName}
              image={image}
              key={image.id}
              prospectId={prospectId}
            />
          ))
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-muted sm:col-span-2 lg:col-span-3">
            <div>
              <ImagePlus className="mx-auto mb-2" size={24} />
              Aucune image rattachee a ce prospect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProspectImageCard({
  canModify,
  companyName,
  image,
  prospectId
}: {
  canModify: boolean;
  companyName: string;
  image: ProspectImageItem;
  prospectId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage({});

    const data = new FormData(event.currentTarget);
    const replacement = data.get("replacement");
    let newStoragePath = "";
    const supabase = createClient();

    if (replacement instanceof File && replacement.size > 0) {
      const extension = getImageExtension(replacement);
      const contentType = replacement.type || imageTypes[extension];
      if (!extension || !contentType) {
        setPending(false);
        setMessage({ error: "Format non accepte. Utilisez JPG, PNG, WEBP, GIF, HEIC ou HEIF." });
        return;
      }
      if (replacement.size > maxImageSize) {
        setPending(false);
        setMessage({ error: "L'image ne doit pas depasser 10 Mo." });
        return;
      }

      const fileName = `${slugifyFilePart(companyName)}_${formatFileTimestamp(new Date())}.${extension}`;
      newStoragePath = `${prospectId}/${fileName}`;
      const { error } = await supabase.storage
        .from(imageBucket)
        .upload(newStoragePath, replacement, { contentType, upsert: false });

      if (error) {
        setPending(false);
        setMessage({ error: `Remplacement impossible (${error.message}).` });
        return;
      }

      data.set("storage_path", newStoragePath);
      data.set("file_name", fileName);
      data.set("original_file_name", replacement.name);
      data.set("content_type", contentType);
      data.set("file_size", String(replacement.size));
    }

    data.set("prospect_id", prospectId);
    data.set("image_id", image.id);
    const result = await updateProspectImage(data);

    if (result?.error) {
      if (newStoragePath) await supabase.storage.from(imageBucket).remove([newStoragePath]);
      setMessage({ error: result.error });
    } else {
      setEditing(false);
      setMessage({ success: result?.success });
      router.refresh();
    }
    setPending(false);
  }

  async function handleDelete() {
    if (!window.confirm("Supprimer definitivement cette photo ?")) return;
    setPending(true);
    setMessage({});
    const data = new FormData();
    data.set("prospect_id", prospectId);
    data.set("image_id", image.id);
    const result = await deleteProspectImage(data);
    if (result?.error) {
      setMessage({ error: result.error });
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <article className="overflow-hidden rounded-md border border-border bg-white">
      {image.signedUrl ? (
        <a href={image.signedUrl} rel="noreferrer" target="_blank">
          <img
            alt={image.notes ?? image.fileName}
            className="aspect-[4/3] w-full object-cover"
            src={image.signedUrl}
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-background text-muted">
          <Camera size={28} />
        </div>
      )}
      <div className="space-y-2 p-3 text-sm">
        <p className="break-words font-medium">{image.fileName}</p>
        <p className="text-xs text-muted">{formatDateTime(image.createdAt)}</p>

        {editing ? (
          <form className="space-y-3" onSubmit={handleUpdate}>
            <label className="block text-xs font-medium">
              Remplacer la photo (facultatif)
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                className="mt-1 block w-full text-xs"
                disabled={pending}
                name="replacement"
                type="file"
              />
            </label>
            <label className="block text-xs font-medium">
              Commentaire
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border p-2 text-sm"
                defaultValue={image.notes ?? ""}
                disabled={pending}
                name="notes"
              />
            </label>
            <div className="flex gap-2">
              <button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
                <Save size={15} /> {pending ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button className="inline-flex size-10 items-center justify-center rounded-md border border-border" disabled={pending} onClick={() => setEditing(false)} title="Annuler" type="button">
                <X size={16} />
              </button>
            </div>
          </form>
        ) : (
          <>
            {image.notes ? <p className="text-muted">{image.notes}</p> : null}
            {canModify ? (
              <div className="flex gap-2 pt-1">
                <button className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 font-semibold" disabled={pending} onClick={() => setEditing(true)} type="button">
                  <Pencil size={15} /> Modifier
                </button>
                <button className="inline-flex size-10 items-center justify-center rounded-md border border-red-200 text-red-600" disabled={pending} onClick={handleDelete} title="Supprimer la photo" type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : null}
          </>
        )}

        {message.error ? <p className="text-xs font-medium text-red-600">{message.error}</p> : null}
        {message.success ? <p className="text-xs font-medium text-emerald-700">{message.success}</p> : null}
      </div>
    </article>
  );
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (imageTypes[extension]) return extension === "jpeg" ? "jpg" : extension;

  const match = Object.entries(imageTypes).find(([, mime]) => mime === file.type);
  return match?.[0] === "jpeg" ? "jpg" : match?.[0] ?? "";
}

function slugifyFilePart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prospect"
  );
}

function formatFileTimestamp(date: Date) {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds(), 3)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
