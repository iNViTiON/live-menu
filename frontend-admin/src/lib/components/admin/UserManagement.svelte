<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { usersStore } from '$lib/stores/users.svelte';
  import PasskeyList from './PasskeyList.svelte';
  import type { User } from '@live-menu/shared';

  const users = $derived(usersStore.users);
  const loading = $derived(usersStore.isLoading);

  let editingUserId = $state<number | null>(null);
  let editingName = $state('');
  let deleteConfirmUser = $state<User | null>(null);
  let error = $state('');
  let savingUserId = $state<number | null>(null);
  let deletingUserId = $state<number | null>(null);
  let passkeyModalUser = $state<{ id: number; name: string; role: string } | null>(null);

  onMount(() => {
    usersStore.loadUsers();
  });

  function startEditName(user: User) {
    editingUserId = user.id;
    editingName = user.name;
  }

  function cancelEditName() {
    editingUserId = null;
    editingName = '';
  }

  async function saveName(userId: number) {
    if (!editingName.trim()) {
      error = 'Name cannot be empty';
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      savingUserId = userId;
      error = '';
      await usersStore.updateUser(userId, { name: editingName.trim() });
      editingUserId = null;
      editingName = '';
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to update name';
    } finally {
      savingUserId = null;
    }
  }

  async function changeRole(userId: number, newRole: string) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Change ${user.name}'s role to ${newRole}?`)) {
      await usersStore.loadUsers();
      return;
    }

    try {
      savingUserId = userId;
      error = '';
      await usersStore.updateUser(userId, { role: newRole as User['role'] });
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to update role';
      await usersStore.loadUsers();
    } finally {
      savingUserId = null;
    }
  }

  function showDeleteConfirm(user: User) {
    deleteConfirmUser = user;
  }

  function cancelDelete() {
    deleteConfirmUser = null;
  }

  async function confirmDelete() {
    if (!deleteConfirmUser) return;

    try {
      deletingUserId = deleteConfirmUser.id;
      error = '';
      await usersStore.deleteUser(deleteConfirmUser.id);
      deleteConfirmUser = null;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to delete user';
    } finally {
      deletingUserId = null;
    }
  }

  function isCurrentUser(userId: number): boolean {
    return authStore.user?.id === userId;
  }
</script>

<div class="user-management">
  {#if error}
    <div class="error-banner">
      {error}
      <button onclick={() => error = ''} class="close-error">×</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading users...</div>
  {:else if users.length === 0}
    <p class="empty">No users found</p>
  {:else}
    <table class="users-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user (user.id)}
          <tr class:saving={savingUserId === user.id} class:deleting={deletingUserId === user.id}>
            <td>{user.id}</td>
            <td>
              {#if editingUserId === user.id}
                <div class="edit-name">
                  <input
                    type="text"
                    bind:value={editingName}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') saveName(user.id);
                      if (e.key === 'Escape') cancelEditName();
                    }}
                    autofocus
                  />
                  <button onclick={() => saveName(user.id)} class="btn-save" disabled={savingUserId === user.id}>
                    {savingUserId === user.id ? '...' : '✓'}
                  </button>
                  <button onclick={cancelEditName} class="btn-cancel" disabled={savingUserId === user.id}>✕</button>
                </div>
              {:else}
                <div class="name-display">
                  <span>{user.name}</span>
                  <button onclick={() => startEditName(user)} class="btn-edit" title="Edit name">✎</button>
                </div>
              {/if}
            </td>
            <td>
              <select
                value={user.role}
                onchange={(e) => changeRole(user.id, e.currentTarget.value)}
                disabled={savingUserId === user.id}
                class="role-select"
              >
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td>
              <span class="status-badge" class:active={user.is_active}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="td-actions">
                <button
                  class="action-btn"
                  onclick={() => passkeyModalUser = { id: user.id, name: user.name, role: user.role }}
                  title="Manage Passkeys"
                >
                  🔑
                </button>
                <button
                  onclick={() => showDeleteConfirm(user)}
                  class="btn-delete"
                  disabled={isCurrentUser(user.id) || deletingUserId === user.id}
                  title={isCurrentUser(user.id) ? 'Cannot delete yourself' : 'Delete user'}
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if deleteConfirmUser}
  <div class="modal-overlay" onclick={cancelDelete} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <h3>Delete User?</h3>
      <p>Are you sure you want to delete <strong>{deleteConfirmUser.name}</strong>?</p>
      <p class="warning">This will permanently delete the user and all their data. This cannot be undone.</p>
      <div class="modal-actions">
        <button onclick={cancelDelete} class="btn-secondary" disabled={deletingUserId !== null}>Cancel</button>
        <button onclick={confirmDelete} class="btn-danger" disabled={deletingUserId !== null}>
          {deletingUserId ? 'Deleting...' : 'Delete User'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if passkeyModalUser}
  <div class="modal-overlay" onclick={() => passkeyModalUser = null} role="presentation">
    <div class="modal modal-large" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <PasskeyList
        userId={passkeyModalUser.id}
        userName={passkeyModalUser.name}
        userRole={passkeyModalUser.role}
        onClose={() => passkeyModalUser = null}
      />
    </div>
  </div>
{/if}

<style>
  .user-management {
    position: relative;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-error {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: inherit;
    padding: 0;
    line-height: 1;
  }

  .loading, .empty {
    text-align: center;
    padding: 1.5rem;
    color: #999;
    font-style: italic;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table thead tr {
    border-bottom: 2px solid #ddd;
  }

  .users-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .users-table tbody tr {
    border-bottom: 1px solid #eee;
  }

  .users-table tbody tr.saving {
    opacity: 0.6;
  }

  .users-table tbody tr.deleting {
    opacity: 0.4;
  }

  .users-table td {
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
  }

  .name-display {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-edit {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    font-size: 0.95rem;
    color: #0066cc;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .btn-edit:hover {
    opacity: 1;
  }

  .edit-name {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .edit-name input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .btn-save, .btn-cancel {
    padding: 0.2rem 0.45rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.15s;
  }

  .btn-save { background: #28a745; color: white; }
  .btn-save:hover:not(:disabled) { background: #218838; }
  .btn-cancel { background: #6c757d; color: white; }
  .btn-cancel:hover:not(:disabled) { background: #5a6268; }
  .btn-save:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

  .role-select {
    padding: 0.2rem 0.4rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .role-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-badge {
    padding: 0.2rem 0.45rem;
    border-radius: 4px;
    font-size: 0.78rem;
    background: #dc3545;
    color: white;
  }

  .status-badge.active {
    background: #28a745;
  }

  .td-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .action-btn, .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem 0.4rem;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .action-btn:hover, .btn-delete:hover:not(:disabled) {
    opacity: 1;
  }

  .btn-delete:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
  }

  .modal-large {
    max-width: 800px;
  }

  .modal h3 {
    margin: 0 0 0.75rem 0;
  }

  .modal p {
    margin: 0.4rem 0;
    line-height: 1.5;
  }

  .modal .warning {
    color: #721c24;
    background: #f8d7da;
    padding: 0.6rem;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-top: 0.75rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.25rem;
  }

  .btn-secondary, .btn-danger {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.15s;
  }

  .btn-secondary { background: #6c757d; color: white; }
  .btn-secondary:hover:not(:disabled) { background: #5a6268; }
  .btn-danger { background: #dc3545; color: white; }
  .btn-danger:hover:not(:disabled) { background: #c82333; }
  .btn-secondary:disabled, .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 768px) {
    .users-table {
      display: block;
    }

    .users-table thead {
      display: none;
    }

    .users-table tbody {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .users-table tbody tr {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.75rem;
      align-items: center;
      padding: 0.75rem;
      border: 1px solid #eee;
      border-radius: 6px;
      background: #fafafa;
    }

    .users-table td {
      padding: 0;
      font-size: 0.9rem;
    }

    /* ID column */
    .users-table td:nth-child(1) {
      font-size: 0.78rem;
      color: #999;
      order: 5;
    }

    /* Name column */
    .users-table td:nth-child(2) {
      flex: 1;
      min-width: 0;
      font-weight: 500;
    }

    /* Role select */
    .users-table td:nth-child(3) {
      order: 3;
    }

    /* Status */
    .users-table td:nth-child(4) {
      order: 4;
    }

    /* Actions */
    .users-table td:nth-child(5) {
      order: 2;
    }

    .action-btn, .btn-delete {
      min-height: 36px;
      min-width: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .modal {
      margin: 1rem;
      max-width: calc(100vw - 2rem);
    }

    .modal-large {
      max-width: calc(100vw - 2rem);
    }
  }
</style>
