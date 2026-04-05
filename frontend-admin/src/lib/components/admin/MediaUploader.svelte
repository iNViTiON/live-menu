<script lang="ts">
  interface MediaLike {
    media_type: 'image' | 'video';
    r2_key: string;
    original_filename: string | null;
  }

  interface Props {
    lang: string;
    currentMedia: MediaLike | undefined;
    onUpload: (lang: string, file: File) => Promise<void>;
    onDelete: (lang: string) => Promise<void>;
  }

  let { lang, currentMedia, onUpload, onDelete }: Props = $props();

  let isUploading = $state(false);
  let uploadError = $state<string | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  async function handleFileChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isUploading = true;
    uploadError = null;

    try {
      await onUpload(lang, file);
    } catch (err: unknown) {
      uploadError = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      isUploading = false;
      if (fileInput) fileInput.value = '';
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this media?')) return;
    try {
      await onDelete(lang);
    } catch (err: unknown) {
      uploadError = err instanceof Error ? err.message : 'Delete failed';
    }
  }
</script>

<div class="media-uploader">
  {#if currentMedia}
    <div class="media-preview">
      {#if currentMedia.media_type === 'image'}
        <img src="/media/{currentMedia.r2_key}" alt="Media" />
      {:else}
        <video src="/media/{currentMedia.r2_key}" muted playsinline></video>
      {/if}
      <div class="media-meta">
        <span class="media-type">{currentMedia.media_type}</span>
        <span class="media-filename">{currentMedia.original_filename || currentMedia.r2_key}</span>
      </div>
      <button class="btn-delete-media" onclick={handleDelete} title="Delete media">
        Delete
      </button>
    </div>
  {:else}
    <div class="no-media">No media uploaded</div>
  {/if}

  {#if uploadError}
    <div class="upload-error">{uploadError}</div>
  {/if}

  <label class="upload-label" class:disabled={isUploading}>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*,video/*"
      onchange={handleFileChange}
      disabled={isUploading}
      class="file-input"
    />
    {#if isUploading}
      Uploading...
    {:else}
      {currentMedia ? 'Replace media' : 'Upload media'}
    {/if}
  </label>
</div>

<style>
  .media-uploader {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .media-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f9f9f9;
  }

  .media-preview img,
  .media-preview video {
    width: 80px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .media-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .media-type {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
  }

  .media-filename {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-delete-media {
    padding: 0.3rem 0.6rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .btn-delete-media:hover {
    background: #c82333;
  }

  .no-media {
    color: #999;
    font-size: 0.85rem;
    font-style: italic;
  }

  .upload-error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .upload-label {
    display: inline-block;
    padding: 0.4rem 0.75rem;
    background: #0066cc;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    align-self: flex-start;
    transition: background-color 0.2s;
  }

  .upload-label:hover:not(.disabled) {
    background: #0052a3;
  }

  .upload-label.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .file-input {
    display: none;
  }
</style>
